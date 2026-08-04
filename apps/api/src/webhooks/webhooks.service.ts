import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowRunnerService } from "../engine/workflow-runner.service";

@Injectable()
export class WebhooksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly runner: WorkflowRunnerService
    ) { }

    /** Public entrypoint — no tenant auth needed, hookPath IS the secret. */
    async handle(hookPath: string, payload: unknown) {
        return this.runner.handleWebhook(hookPath, payload);
    }

    /** Get the public hook URL for a workflow (only if it has one). */
    async getHookForWorkflow(tenantId: string, workflowId: string) {
        const workflow = await this.prisma.workflow.findFirst({
            where: { id: workflowId, tenantId },
            select: { id: true, hookPath: true },
        });
        if (!workflow) throw new Error("Workflow not found");
        return {
            workflowId,
            hookPath: workflow.hookPath,
            url: workflow.hookPath
                ? `/api/hooks/${workflow.hookPath}`
                : null,
        };
    }

    /** Regenerate the hook path for a workflow. */
    async regenerate(tenantId: string, workflowId: string) {
        const workflow = await this.prisma.workflow.findFirst({
            where: { id: workflowId, tenantId },
        });
        if (!workflow) throw new Error("Workflow not found");
        const newPath = this.runner.generateHookPath();
        return this.prisma.workflow.update({
            where: { id: workflowId },
            data: { hookPath: newPath },
            select: { id: true, hookPath: true },
        });
    }
}
