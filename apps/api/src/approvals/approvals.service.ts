import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowRunnerService } from "../engine/workflow-runner.service";

@Injectable()
export class ApprovalsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly runner: WorkflowRunnerService
    ) { }

    async listPending(tenantId: string) {
        return this.prisma.approval.findMany({
            where: {
                status: "pending",
                execution: { tenantId },
            },
            include: {
                execution: {
                    select: {
                        id: true,
                        workflowId: true,
                        status: true,
                        createdAt: true,
                        workflow: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async get(tenantId: string, id: string) {
        const approval = await this.prisma.approval.findFirst({
            where: { id, execution: { tenantId } },
            include: {
                execution: {
                    select: {
                        id: true,
                        workflowId: true,
                        status: true,
                        input: true,
                        steps: true,
                    },
                },
            },
        });
        if (!approval) throw new NotFoundException("Approval not found");
        return approval;
    }

    /**
     * The public approve/reject link — token IS the secret, no auth needed.
     * Called from email links: /approvals/:token/approve
     */
    async decideByToken(token: string, decision: "approved" | "rejected") {
        const approval = await this.prisma.approval.findUnique({
            where: { token },
        });
        if (!approval) throw new NotFoundException("Approval link invalid or expired");
        if (approval.status !== "pending") {
            throw new Error(`Approval already ${approval.status}`);
        }

        await this.prisma.approval.update({
            where: { id: approval.id },
            data: {
                status: decision,
                decidedAt: new Date(),
            },
        });

        // Resume the execution if approved
        if (decision === "approved") {
            try {
                await this.runner.resumeExecution(approval.executionId);
            } catch (err) {
                // Execution may have already been cancelled/timed out
                const message = err instanceof Error ? err.message : String(err);
                return {
                    ok: false,
                    decision,
                    error: message,
                };
            }
        } else {
            // Rejected → mark execution as failed
            await this.prisma.execution.update({
                where: { id: approval.executionId },
                data: { status: "failed", finishedAt: new Date() },
            });
        }

        return { ok: true, decision };
    }

    async listForExecution(tenantId: string, executionId: string) {
        return this.prisma.approval.findMany({
            where: { executionId, execution: { tenantId } },
            orderBy: { createdAt: "desc" },
        });
    }
}
