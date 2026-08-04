import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { GraphExecutorService, NodeExecutionResult } from "./graph-executor.service";
import { LLMService } from "./llm.service";
import { EmailService } from "./email.service";
import { TemplateService } from "./template.service";
import { EncryptionService } from "./encryption.service";
import type {
    AINodeConfig,
    ApprovalNodeConfig,
    ErrorHandlerNodeConfig,
    ExecutionStepTrace,
    FilterNodeConfig,
    LoopNodeConfig,
    MergeNodeConfig,
    SetNodeConfig,
    SplitNodeConfig,
    SubWorkflowNodeConfig,
    TransformNodeConfig,
    WorkflowDefinition,
    WorkflowNode,
} from "@ultron/shared";
import { randomUUID } from "crypto";

/**
 * Executes a workflow definition against a live database,
 * resolving each node type to a real side-effect.
 */
@Injectable()
export class WorkflowRunnerService {
    private readonly logger = new Logger(WorkflowRunnerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly graph: GraphExecutorService,
        private readonly llm: LLMService,
        private readonly email: EmailService,
        private readonly template: TemplateService,
        private readonly encryption: EncryptionService,
        private readonly config: ConfigService
    ) { }

    /**
     * Run a workflow synchronously (for dev/testing) and persist
     * the execution + step traces to the database.
     */
    async runWorkflow(
        workflowId: string,
        tenantId: string,
        input: Record<string, unknown>
    ) {
        const workflow = await this.prisma.workflow.findFirst({
            where: { id: workflowId, tenantId },
        });
        if (!workflow) throw new Error("Workflow not found");

        const execution = await this.prisma.execution.create({
            data: {
                workflowId,
                tenantId,
                version: workflow.version,
                input: JSON.parse(JSON.stringify(input)),
                status: "running",
                steps: [],
            },
        });

        try {
            const definition = workflow.definition as unknown as WorkflowDefinition;
            const result = await this.graph.execute(
                definition,
                input,
                (node, ctx) => this.executeNode(node, {
                    input,
                    nodeOutputs: ctx.nodeOutputs,
                    variables: ctx.variables,
                }, execution.id, tenantId)
            );

            // Persist per-step trace to DB
            await this.prisma.execution.update({
                where: { id: execution.id },
                data: {
                    status: result.status,
                    output: JSON.parse(JSON.stringify(result.finalOutputs ?? {})),
                    steps: JSON.parse(JSON.stringify(result.steps ?? [])),
                    error: result.error,
                    finishedAt: new Date(),
                },
            });
            return { id: execution.id, status: result.status, steps: result.steps };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await this.prisma.execution.update({
                where: { id: execution.id },
                data: { status: "failed", error: message, finishedAt: new Date() },
            });
            throw err;
        }
    }

    /** Resume a waiting-approval execution after a human decides. */
    async resumeExecution(executionId: string) {
        const execution = await this.prisma.execution.findUnique({
            where: { id: executionId },
        });
        if (!execution) throw new Error("Execution not found");

        const steps = (execution.steps as unknown as ExecutionStepTrace[]) ?? [];
        const definition = (await this.prisma.workflow.findUnique({
            where: { id: execution.workflowId },
        }))?.definition as unknown as WorkflowDefinition | undefined;
        if (!definition) throw new Error("Workflow not found");

        const input = (execution.input as Record<string, unknown>) ?? {};
        const approvalMarked = steps.filter((s) => s.status === "waiting_approval");
        const resumeFrom = new Set(approvalMarked.map((s) => s.nodeId));
        const alreadySucceeded = new Set(steps.filter((s) => s.status === "succeeded" || s.status === "skipped").map((s) => s.nodeId));

        const result = await this.graph.execute(
            definition,
            input,
            async (node, ctx) => {
                if (resumeFrom.has(node.id) || alreadySucceeded.has(node.id)) {
                    // Node already ran. Return its prior output.
                    const prior = steps.find((s) => s.nodeId === node.id);
                    const priorOutput = (prior?.output as Record<string, unknown>) ?? {};
                    let branch: boolean | undefined = undefined;
                    if (node.type === "condition") {
                        branch = priorOutput.matched as boolean | undefined;
                    }
                    return { output: priorOutput, branch };
                }
                return this.executeNode(node, {
                    input,
                    nodeOutputs: ctx.nodeOutputs,
                    variables: ctx.variables,
                }, executionId, execution.tenantId);
            }
        );

        await this.prisma.execution.update({
            where: { id: executionId },
            data: {
                status: result.status,
                output: JSON.parse(JSON.stringify(result.finalOutputs ?? {})),
                steps: JSON.parse(JSON.stringify(result.steps ?? [])),
                error: result.error,
                finishedAt: result.status === "succeeded" ? new Date() : undefined,
            },
        });
        return { id: executionId, status: result.status };
    }

    /** Generate a public webhook path for a workflow. */
    generateHookPath(): string {
        return `h_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    }

    /** Dispatch an incoming webhook payload to the attached workflow. */
    async handleWebhook(hookPath: string, payload: unknown) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { hookPath },
        });
        if (!workflow) throw new Error("Unknown webhook path");
        if (workflow.status !== "active") {
            throw new Error(`Workflow is ${workflow.status}, not active`);
        }
        return this.runWorkflow(workflow.id, workflow.tenantId, {
            ...(typeof payload === "object" && payload !== null
                ? (payload as Record<string, unknown>)
                : {}),
            _webhookPath: hookPath,
        });
    }

    // ------------------------------------------------------------
    // Node execution dispatch
    // ------------------------------------------------------------
    private async executeNode(
        node: WorkflowNode,
        ctx: {
            input: Record<string, unknown>;
            nodeOutputs: Record<string, unknown>;
            variables: Record<string, unknown>;
        },
        executionId: string,
        tenantId: string
    ): Promise<NodeExecutionResult> {
        const cfg = node.data.config as Record<string, unknown> | undefined;
        switch (node.type) {
            case "trigger": {
                const kind = node.data.kind ?? "webhook";
                if (kind === "webhook") {
                    // The input IS the payload — pass it through.
                    return { output: { ...ctx.input } };
                }
                return { output: { trigger: "manual", ...ctx.input } };
            }

            case "ai": {
                const aiCfg = cfg as unknown as AINodeConfig;
                let customKey: string | undefined;
                if (aiCfg.keyMode === "custom" && aiCfg.customKeyId) {
                    customKey = await this.lookupApiKey(aiCfg.customKeyId, tenantId);
                }
                // Resolve {{nodeId.field}} templates in the user prompt
                const prompt = this.template.resolveString(
                    aiCfg.userPrompt ?? "Analyze the input: {{trigger}}",
                    ctx.nodeOutputs
                );
                const result = await this.llm.generate(aiCfg, prompt, customKey);
                return {
                    output: {
                        text: result.text,
                        json: result.json,
                        tokensUsed: result.tokensUsed,
                        costUsd: result.costUsd,
                    },
                };
            }

            case "action": {
                const kind = node.data.kind ?? "email";
                if (kind === "email") {
                    const emailCfg = cfg as unknown as {
                        to: string;
                        subject: string;
                        body: string;
                    };
                    const to = this.template.resolveString(emailCfg.to, ctx.nodeOutputs);
                    const subject = this.template.resolveString(emailCfg.subject, ctx.nodeOutputs);
                    const body = this.template.resolveObject(
                        this.template.resolveString(emailCfg.body, ctx.nodeOutputs),
                        ctx.nodeOutputs
                    );
                    const sent = await this.email.send({
                        to,
                        subject,
                        body: typeof body === "string" ? body : JSON.stringify(body),
                    });
                    return { output: { sent: true, provider: sent.provider, id: sent.id } };
                }
                if (kind === "http") {
                    const httpCfg = cfg as unknown as {
                        method: string;
                        url: string;
                        headers?: Record<string, string>;
                        body?: unknown;
                    };
                    const url = this.template.resolveString(httpCfg.url, ctx.nodeOutputs);
                    const headers = this.template.resolveObject(
                        httpCfg.headers ?? {},
                        ctx.nodeOutputs
                    ) as Record<string, string>;
                    const body = this.template.resolveObject(httpCfg.body ?? {}, ctx.nodeOutputs);
                    const res = await fetch(url, {
                        method: httpCfg.method ?? "POST",
                        headers: { "Content-Type": "application/json", ...headers },
                        body:
                            typeof body === "string"
                                ? body
                                : JSON.stringify(body ?? {}),
                    });
                    const text = await res.text();
                    let json: unknown = undefined;
                    try {
                        json = JSON.parse(text);
                    } catch {
                        /* not JSON */
                    }
                    return {
                        output: {
                            status: res.status,
                            ok: res.ok,
                            body: json ?? text,
                        },
                    };
                }
                if (kind === "slack") {
                    const slackCfg = cfg as unknown as {
                        channel: string;
                        text: string;
                    };
                    const text = this.template.resolveString(slackCfg.text, ctx.nodeOutputs);
                    const token = this.config.get("SLACK_BOT_TOKEN");
                    if (!token) {
                        throw new Error("SLACK_BOT_TOKEN not configured in env");
                    }
                    const res = await fetch("https://slack.com/api/chat.postMessage", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            channel: slackCfg.channel,
                            text,
                        }),
                    });
                    const data = await res.json();
                    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
                    return { output: { sent: true, ts: data.ts } };
                }
                if (kind === "database") {
                    const dbCfg = cfg as unknown as {
                        operation: string;
                        table: string;
                        data: Record<string, unknown>;
                    };
                    const table = this.template.resolveString(dbCfg.table, ctx.nodeOutputs) ?? "default";
                    const data = this.template.resolveObject(dbCfg.data ?? {}, ctx.nodeOutputs);
                    const operation = dbCfg.operation ?? "insert";
                    if (operation === "insert") {
                        const record = await this.prisma.workflowRecord.create({
                            data: {
                                tenantId,
                                table,
                                data: JSON.parse(JSON.stringify(data)),
                            },
                        });
                        return { output: { id: record.id, table, operation: "insert" } };
                    }
                    if (operation === "query") {
                        const records = await this.prisma.workflowRecord.findMany({
                            where: { tenantId, table },
                            orderBy: { createdAt: "desc" },
                            take: 100,
                        });
                        return { output: { table, count: records.length, records } };
                    }
                    throw new Error(`Unsupported database operation: ${operation}`);
                }
                if (kind === "webhook_out") {
                    const whCfg = cfg as unknown as {
                        url: string;
                        method: string;
                        headers?: Record<string, string>;
                    };
                    const url = this.template.resolveString(whCfg.url, ctx.nodeOutputs);
                    const headers = this.template.resolveObject(
                        whCfg.headers ?? {},
                        ctx.nodeOutputs
                    ) as Record<string, string>;
                    const res = await fetch(url, {
                        method: whCfg.method ?? "POST",
                        headers: { "Content-Type": "application/json", ...headers },
                        body: JSON.stringify(ctx.nodeOutputs ?? {}),
                    });
                    const text = await res.text();
                    let json: unknown = undefined;
                    try {
                        json = JSON.parse(text);
                    } catch {
                        /* not JSON */
                    }
                    return { output: { status: res.status, ok: res.ok, body: json ?? text } };
                }
                throw new Error(`Unsupported action kind: ${kind}`);
            }

            case "approval": {
                const approvalCfg = cfg as unknown as ApprovalNodeConfig;
                // Create an approval token + record
                const token = randomUUID().replace(/-/g, "");
                await this.prisma.approval.create({
                    data: {
                        executionId,
                        nodeId: node.id,
                        message:
                            this.template.resolveString(
                                approvalCfg.message ?? "Please approve this step.",
                                ctx.nodeOutputs
                            ) ?? "Please approve this step.",
                        status: "pending",
                        token,
                    },
                });
                const appBaseUrl =
                    this.config.get("APP_BASE_URL") ?? "http://localhost:3000";
                const approveUrl = `${appBaseUrl}/api/approvals/${token}/approve`;
                const rejectUrl = `${appBaseUrl}/api/approvals/${token}/reject`;
                const message = `Action required: ${this.template.resolveString(approvalCfg.message ?? "Please approve this step.", ctx.nodeOutputs)
                    }\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}`;
                await this.email.send({
                    to: approvalCfg.approvers?.[0] ?? "admin@localhost",
                    subject: "[ultron] Approval required",
                    body: message,
                });
                // Mark the DB execution as waiting_approval
                await this.prisma.execution.update({
                    where: { id: executionId },
                    data: { status: "waiting_approval" },
                });
                return {
                    output: { approvalRequested: true, token },
                    waitingForApproval: true,
                };
            }

            case "condition": {
                const condCfg = cfg as unknown as {
                    field: string;
                    operator: string;
                    value?: unknown;
                };
                const resolvedField = this.template.resolveString(condCfg.field, ctx.nodeOutputs);
                const actual = this.resolvePath(ctx.nodeOutputs, resolvedField);
                const operator = condCfg.operator ?? "eq";
                const expected = this.template.resolveObject(condCfg.value, ctx.nodeOutputs);
                const branch = this.evaluateCondition(actual, operator, expected);
                return { output: { field: actual, matched: branch }, branch };
            }

            case "delay": {
                const delayCfg = cfg as unknown as { seconds: number };
                const seconds = delayCfg.seconds ?? 0;
                if (seconds > 0) {
                    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
                }
                return { output: { waitedSeconds: seconds } };
            }

            case "code": {
                const codeCfg = cfg as unknown as { code: string };
                // NOTE: For Phase 1 this uses `new Function` (not sandboxed).
                // A real V8 isolate (isolated-vm / quickjs) is a Phase 2 hardening step.
                const fn = new Function(
                    "input",
                    "helpers",
                    `with (helpers) { ${codeCfg.code ?? "return input;"} }`
                );
                const output = fn(ctx.input, {
                    outputs: ctx.nodeOutputs,
                    JSON,
                    Math,
                    Date,
                    String,
                    Number,
                    Boolean,
                });
                return { output };
            }

            case "filter": {
                const filterCfg = cfg as unknown as FilterNodeConfig;
                const fieldValue = this.resolvePath(ctx.nodeOutputs, filterCfg.condition.field);
                const matches = this.evaluateCondition(
                    fieldValue,
                    filterCfg.condition.operator,
                    filterCfg.condition.value
                );
                if (matches) {
                    return { output: { ...ctx.input, _filterPassed: true } };
                }
                if (filterCfg.discardMode === "route_to_error") {
                    return { output: { _filterPassed: false, _filterError: "Item did not match filter" } };
                }
                return { output: null, branch: false };
            }

            case "set": {
                const setCfg = cfg as unknown as SetNodeConfig;
                const result: Record<string, unknown> = setCfg.merge ? { ...(ctx.input as Record<string, unknown>) } : {};
                for (const [key, template] of Object.entries(setCfg.values)) {
                    result[key] = this.template.resolveString(template, ctx.nodeOutputs);
                }
                return { output: result };
            }

            case "merge": {
                const mergeCfg = cfg as unknown as MergeNodeConfig;
                const inputs = ctx.nodeOutputs;
                if (mergeCfg.mode === "append") {
                    const arr: unknown[] = [];
                    for (const val of Object.values(inputs)) {
                        if (Array.isArray(val)) arr.push(...val);
                        else if (val !== null && val !== undefined) arr.push(val);
                    }
                    return { output: { [mergeCfg.resultKey]: arr } };
                }
                if (mergeCfg.mode === "combine") {
                    return { output: { [mergeCfg.resultKey]: inputs } };
                }
                // zip mode
                const keys = Object.keys(inputs);
                const maxLen = Math.max(...keys.map((k) => Array.isArray(inputs[k]) ? (inputs[k] as unknown[]).length : 1));
                const zipped: unknown[] = [];
                for (let i = 0; i < maxLen; i++) {
                    const item: Record<string, unknown> = {};
                    for (const k of keys) {
                        item[k] = Array.isArray(inputs[k]) ? (inputs[k] as unknown[])[i % (inputs[k] as unknown[]).length] : inputs[k];
                    }
                    zipped.push(item);
                }
                return { output: { [mergeCfg.resultKey]: zipped } };
            }

            case "split": {
                const splitCfg = cfg as unknown as SplitNodeConfig;
                const arr = this.resolvePath(ctx.nodeOutputs, splitCfg.field);
                if (!Array.isArray(arr)) return { output: ctx.input };
                const batchSize = Math.max(1, splitCfg.batchSize);
                const batches: unknown[] = [];
                for (let i = 0; i < arr.length; i += batchSize) {
                    batches.push(arr.slice(i, i + batchSize));
                }
                return { output: { batches, totalBatches: batches.length, currentBatch: 0 } };
            }

            case "loop": {
                const loopCfg = cfg as unknown as LoopNodeConfig;
                const arr = this.resolvePath(ctx.nodeOutputs, loopCfg.field);
                if (!Array.isArray(arr)) return { output: ctx.input };
                const maxIter = Math.max(1, loopCfg.maxIterations);
                const results: unknown[] = [];
                for (let i = 0; i < Math.min(arr.length, maxIter); i++) {
                    results.push({ index: i, item: arr[i] });
                }
                return { output: { iterations: results, totalItems: arr.length } };
            }

            case "subworkflow": {
                const subCfg = cfg as unknown as SubWorkflowNodeConfig;
                if (!subCfg.targetWorkflowId) {
                    throw new Error("Sub-workflow: targetWorkflowId is required");
                }
                const targetWorkflow = await this.prisma.workflow.findUnique({
                    where: { id: subCfg.targetWorkflowId },
                });
                if (!targetWorkflow) throw new Error(`Sub-workflow not found: ${subCfg.targetWorkflowId}`);
                if (targetWorkflow.status !== "active") {
                    throw new Error(`Sub-workflow is ${targetWorkflow.status}, not active`);
                }
                const mappedInput: Record<string, unknown> = {};
                for (const [key, template] of Object.entries(subCfg.inputMapping)) {
                    mappedInput[key] = this.template.resolveString(template, ctx.nodeOutputs);
                }
                const subResult = await this.graph.execute(
                    targetWorkflow.definition as unknown as WorkflowDefinition,
                    mappedInput,
                    (node, nodeCtx) => this.executeNode(node, {
                        input: mappedInput,
                        nodeOutputs: nodeCtx.nodeOutputs,
                        variables: nodeCtx.variables,
                    }, `${executionId}-sub-${subCfg.targetWorkflowId}`, tenantId)
                );
                return { output: { subWorkflowId: subCfg.targetWorkflowId, result: subResult.finalOutputs, status: subResult.status } };
            }

            case "error_handler": {
                const errCfg = cfg as unknown as ErrorHandlerNodeConfig;
                const upstreamError = (ctx.input as Record<string, unknown>)._error;
                if (!upstreamError) {
                    return { output: { handled: true, error: null } };
                }
                if (errCfg.action === "stop") {
                    return { output: { handled: false, error: upstreamError }, branch: false };
                }
                if (errCfg.action === "retry" && errCfg.retryCount > 0) {
                    await new Promise((resolve) => setTimeout(resolve, errCfg.retryDelay * 1000));
                    return { output: { handled: true, retried: true, retryCount: errCfg.retryCount } };
                }
                return { output: { handled: true, error: upstreamError, action: "continued" } };
            }

            case "transform": {
                const transformCfg = cfg as unknown as TransformNodeConfig;
                const inputArr = this.resolvePath(ctx.nodeOutputs, transformCfg.inputField);
                const items = Array.isArray(inputArr) ? inputArr : [inputArr];
                const results = items.map((item: unknown) => {
                    try {
                        const fn = new Function("item", `return ${transformCfg.expression}`);
                        return fn(item);
                    } catch {
                        return item;
                    }
                });
                const resultObj: Record<string, unknown> = {};
                resultObj[transformCfg.outputField] = results;
                return { output: resultObj };
            }

            default:
                return { output: {} };
        }
    }

    private async lookupApiKey(id: string, tenantId: string): Promise<string> {
        const key = await this.prisma.apiKey.findFirst({
            where: { id, tenantId },
        });
        if (!key) throw new Error("Custom API key not found");
        return this.encryption.decrypt({
            cipher: key.keyCipher,
            iv: key.keyIv,
            tag: key.keyTag,
        });
    }

    private resolvePath(
        obj: Record<string, unknown>,
        path: string
    ): unknown {
        if (!path) return undefined;
        // Also handle {{nodeId.field}} templates
        const m = path.match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
        if (m) path = m[1];
        const segments = path.split(".");
        let value: unknown = obj;
        for (const seg of segments) {
            if (value === null || value === undefined) return undefined;
            if (typeof value === "object") {
                value = (value as Record<string, unknown>)[seg];
            } else {
                return undefined;
            }
        }
        return value;
    }

    private evaluateCondition(
        actual: unknown,
        operator: string,
        expected: unknown
    ): boolean {
        switch (operator) {
            case "eq":
                return actual == expected;
            case "neq":
                return actual != expected;
            case "gt":
                return (actual as number) > (expected as number);
            case "gte":
                return (actual as number) >= (expected as number);
            case "lt":
                return (actual as number) < (expected as number);
            case "lte":
                return (actual as number) <= (expected as number);
            case "contains": {
                if (typeof actual === "string" && typeof expected === "string") {
                    return actual.includes(expected);
                }
                if (Array.isArray(actual)) {
                    return actual.includes(expected);
                }
                return false;
            }
            case "exists":
                return actual !== undefined && actual !== null;
            default:
                return actual == expected;
        }
    }
}
