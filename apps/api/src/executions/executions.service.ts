import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ExecutionQueueService } from "../engine/queue.service";
import { WorkflowRunnerService } from "../engine/workflow-runner.service";
import type { ExecutionStepTrace } from "@ultron/shared";

const DEFAULT_TENANT = "tenant_local";

@Injectable()
export class ExecutionsService {
    private readonly logger = new Logger(ExecutionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly queue: ExecutionQueueService,
        private readonly runner: WorkflowRunnerService
    ) { }

    async list(tenantId: string, workflowId?: string, limit = 50) {
        return this.prisma.execution.findMany({
            where: {
                tenantId,
                ...(workflowId ? { workflowId } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(limit, 200),
            include: {
                workflow: {
                    select: { name: true },
                },
            },
        });
    }

    async get(tenantId: string, id: string) {
        const execution = await this.prisma.execution.findFirst({
            where: { id, tenantId },
            include: {
                workflow: {
                    select: { name: true },
                },
            },
        });
        if (!execution) throw new NotFoundException("Execution not found");
        return execution;
    }

    async trigger(
        tenantId: string,
        workflowId: string,
        input: Record<string, unknown>
    ) {
        const workflow = await this.prisma.workflow.findFirst({
            where: { id: workflowId, tenantId },
        });
        if (!workflow) throw new NotFoundException("Workflow not found");
        if (workflow.status !== "active") {
            this.logger.warn(`Workflow ${workflowId} is ${workflow.status}, allowing execution in dev mode`);
        }

        // Create the execution row first so it appears as "queued"
        const execution = await this.prisma.execution.create({
            data: {
                workflowId,
                tenantId,
                version: workflow.version,
                input: JSON.parse(JSON.stringify(input)),
                status: "queued",
                steps: [],
            },
        });

        return this.queue.enqueue({
            executionId: execution.id,
            workflowId,
            tenantId,
            input,
        });
    }

    async retry(tenantId: string, executionId: string) {
        const execution = await this.get(tenantId, executionId);
        if (execution.status !== "failed") {
            throw new Error("Only failed executions can be retried");
        }
        const input = (execution.input as Record<string, unknown>) ?? {};
        return this.queue.enqueue({
            executionId: execution.id,
            workflowId: execution.workflowId,
            tenantId,
            input,
        });
    }

    async cancel(tenantId: string, executionId: string) {
        const execution = await this.get(tenantId, executionId);
        if (!["queued", "running", "waiting_approval"].includes(execution.status)) {
            throw new Error(
                `Cannot cancel execution in status "${execution.status}"`
            );
        }
        return this.prisma.execution.update({
            where: { id: executionId },
            data: { status: "cancelled", finishedAt: new Date() },
        });
    }

    /** Get the full step trace for an execution. */
    async steps(tenantId: string, executionId: string) {
        const execution = await this.get(tenantId, executionId);
        return (execution.steps as unknown as ExecutionStepTrace[]) ?? [];
    }
}
