import { Injectable, Logger } from "@nestjs/common";
import type {
    ExecutionContext,
    ExecutionStepTrace,
    WorkflowDefinition,
    WorkflowEdge,
    WorkflowNode,
} from "@ultron/shared";

export interface NodeExecutionResult {
    output?: unknown;
    branch?: boolean;
    waitingForApproval?: boolean;
}

export interface GraphExecutionResult {
    steps: ExecutionStepTrace[];
    finalOutputs: Record<string, unknown>;
    status: "succeeded" | "failed" | "waiting_approval";
    error?: string;
}

/** Executes a workflow DAG in deterministic topological order. */
@Injectable()
export class GraphExecutorService {
    private readonly logger = new Logger(GraphExecutorService.name);

    async execute(
        definition: WorkflowDefinition,
        input: Record<string, unknown>,
        executeNode: (
            node: WorkflowNode,
            ctx: ExecutionContext
        ) => Promise<NodeExecutionResult>
    ): Promise<GraphExecutionResult> {
        const { nodes, edges } = definition;
        const steps: ExecutionStepTrace[] = [];
        const nodeOutputs: Record<string, unknown> = {};
        const context: ExecutionContext = { input, nodeOutputs, variables: {} };

        const order = this.topologicalOrder(nodes, edges);
        const skipped = new Set<string>();
        const waiting = new Set<string>();
        const branchTaken = new Map<string, string>();

        let status: "succeeded" | "failed" | "waiting_approval" = "succeeded";
        let errorMessage: string | undefined;

        for (const node of order) {
            const incoming = edges.filter((e) => e.target === node.id);

            const onDeadBranch = incoming.some((e) => {
                const taken = branchTaken.get(e.source);
                return taken !== undefined &&
                    e.sourceHandle !== undefined &&
                    e.sourceHandle !== taken;
            });
            const upstreamBlocked = incoming.some(
                (e) => skipped.has(e.source) || waiting.has(e.source)
            );
            if (onDeadBranch || upstreamBlocked) {
                this.skipNode(steps, node);
                skipped.add(node.id);
                continue;
            }

            const startedAt = new Date().toISOString();
            try {
                const result = await executeNode(node, context);
                const finishedAt = new Date().toISOString();
                const durationMs =
                    Date.parse(finishedAt) - Date.parse(startedAt);

                if (result.output !== undefined) {
                    nodeOutputs[node.id] = result.output;
                }

                const step: ExecutionStepTrace = {
                    nodeId: node.id,
                    nodeType: node.type,
                    nodeLabel: this.label(node),
                    status: "succeeded",
                    startedAt,
                    finishedAt,
                    durationMs,
                    output: result.output,
                };

                if (result.waitingForApproval) {
                    step.status = "waiting_approval";
                    waiting.add(node.id);
                    if (status === "succeeded") status = "waiting_approval";
                } else {
                    if (result.branch !== undefined) {
                        branchTaken.set(node.id, String(result.branch));
                    }
                }
                steps.push(step);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err);
                const finishedAt = new Date().toISOString();
                steps.push({
                    nodeId: node.id,
                    nodeType: node.type,
                    nodeLabel: this.label(node),
                    status: "failed",
                    startedAt,
                    finishedAt,
                    durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
                    error: { message },
                });
                status = "failed";
                errorMessage = message;
                break;
            }
        }

        // Mark unreached nodes as skipped
        const executedIds = new Set(steps.map((s) => s.nodeId));
        for (const node of nodes) {
            if (!executedIds.has(node.id)) {
                this.skipNode(steps, node);
            }
        }

        return {
            steps,
            finalOutputs: nodeOutputs,
            status,
            error: errorMessage,
        };
    }

    private label(node: WorkflowNode): string {
        return (node.data.label as string) || node.id;
    }

    private skipNode(steps: ExecutionStepTrace[], node: WorkflowNode): void {
        if (steps.some((s) => s.nodeId === node.id)) return;
        steps.push({
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: this.label(node),
            status: "skipped",
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: 0,
        });
    }

    /** Kahn's algorithm; throws on cycles. */
    private topologicalOrder(
        nodes: WorkflowNode[],
        edges: WorkflowEdge[]
    ): WorkflowNode[] {
        const indegree = new Map<string, number>();
        const adj = new Map<string, string[]>();
        for (const n of nodes) indegree.set(n.id, 0);
        for (const e of edges) {
            const list = adj.get(e.source) ?? [];
            list.push(e.target);
            adj.set(e.source, list);
            indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
        }

        const queue: string[] = [];
        for (const [id, deg] of indegree) if (deg === 0) queue.push(id);

        const sorted: WorkflowNode[] = [];
        while (queue.length > 0) {
            const id = queue.shift()!;
            const node = nodes.find((n) => n.id === id);
            if (node) sorted.push(node);
            for (const next of adj.get(id) ?? []) {
                indegree.set(next, (indegree.get(next) ?? 0) - 1);
                if (indegree.get(next) === 0) queue.push(next);
            }
        }

        if (sorted.length !== nodes.length) {
            throw new Error(
                "Workflow contains a cycle. Every branch must terminate."
            );
        }
        return sorted;
    }
}
