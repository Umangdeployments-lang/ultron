import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowRunnerService } from "../engine/workflow-runner.service";
import type { WorkflowDefinition } from "@ultron/shared";

export interface CreateWorkflowDto {
    name: string;
    description?: string;
    definition?: WorkflowDefinition;
}

export interface UpdateWorkflowDto {
    name?: string;
    description?: string;
    definition?: WorkflowDefinition;
    status?: "draft" | "active" | "paused" | "archived";
}

@Injectable()
export class WorkflowsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly runner: WorkflowRunnerService
    ) { }

    async list(tenantId: string) {
        return this.prisma.workflow.findMany({
            where: { tenantId },
            orderBy: { updatedAt: "desc" },
            include: {
                _count: { select: { executions: true } },
            },
        });
    }

    async get(tenantId: string, id: string) {
        const workflow = await this.prisma.workflow.findFirst({
            where: { id, tenantId },
        });
        if (!workflow) throw new NotFoundException("Workflow not found");
        return workflow;
    }

    async create(tenantId: string, dto: CreateWorkflowDto) {
        const defaultDefinition: WorkflowDefinition = {
            version: 1,
            nodes: [],
            edges: [],
        };
        const definition = dto.definition ?? defaultDefinition;

        // Auto-generate a hookPath if the definition contains a webhook trigger
        const hasWebhook =
            definition.nodes?.some(
                (n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "webhook"
            ) ?? false;

        return this.prisma.workflow.create({
            data: {
                name: dto.name,
                description: dto.description,
                definition: definition as unknown as object,
                status: "draft",
                version: 1,
                hookPath: hasWebhook ? this.runner.generateHookPath() : null,
                tenantId,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateWorkflowDto) {
        // Ensure workflow exists
        await this.get(tenantId, id);

        const existing = await this.prisma.workflow.findUnique({
            where: { id },
        });

        let hookPath = existing?.hookPath;
        let definition = dto.definition as WorkflowDefinition | undefined;

        // Regenerate hookPath if new definition has a webhook but no path yet
        if (definition && !hookPath) {
            const hasWebhook =
                definition.nodes?.some(
                    (n) =>
                        n.type === "trigger" &&
                        (n.data.kind ?? "webhook") === "webhook"
                ) ?? false;
            if (hasWebhook) {
                hookPath = this.runner.generateHookPath();
            }
        }

        return this.prisma.workflow.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                definition:
                    definition !== undefined
                        ? (definition as unknown as object)
                        : undefined,
                status: dto.status,
                hookPath,
            },
        });
    }

    async publish(tenantId: string, id: string, changeNote?: string) {
        const workflow = await this.get(tenantId, id);
        const nextVersion = workflow.version + 1;

        // Create immutable version snapshot
        await this.prisma.workflowVersion.create({
            data: {
                workflowId: id,
                version: nextVersion,
                definition: workflow.definition as unknown as object,
                changeNote,
            },
        });

        return this.prisma.workflow.update({
            where: { id },
            data: {
                status: "active",
                version: nextVersion,
            },
        });
    }

    async duplicate(tenantId: string, id: string) {
        const wf = await this.get(tenantId, id);
        const def = wf.definition as unknown as WorkflowDefinition;
        const hasWebhook = def?.nodes?.some(
            (n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "webhook"
        ) ?? false;
        return this.prisma.workflow.create({
            data: {
                name: `${wf.name} (copy)`,
                description: wf.description ?? undefined,
                definition: (def ?? { version: 1, nodes: [], edges: [] }) as unknown as object,
                status: "draft",
                version: 1,
                hookPath: hasWebhook ? this.runner.generateHookPath() : null,
                tenantId,
            },
        });
    }

    async exportJson(tenantId: string, id: string) {
        const wf = await this.get(tenantId, id);
        return {
            name: wf.name,
            description: wf.description ?? "",
            definition: wf.definition,
            exportVersion: 1,
            exportedAt: new Date().toISOString(),
        };
    }

    async importJson(tenantId: string, payload: { name?: string; definition: WorkflowDefinition; description?: string }) {
        const def = payload.definition;
        const hasWebhook = def?.nodes?.some(
            (n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "webhook"
        ) ?? false;
        return this.prisma.workflow.create({
            data: {
                name: payload.name ?? "Imported workflow",
                description: payload.description,
                definition: def as unknown as object,
                status: "draft",
                version: 1,
                hookPath: hasWebhook ? this.runner.generateHookPath() : null,
                tenantId,
            },
        });
    }

    async delete(tenantId: string, id: string) {
        await this.get(tenantId, id);
        await this.prisma.workflow.delete({ where: { id } });
        return { ok: true };
    }

    async versions(tenantId: string, id: string) {
        await this.get(tenantId, id);
        return this.prisma.workflowVersion.findMany({
            where: { workflowId: id },
            orderBy: { version: "desc" },
        });
    }

    async rollback(tenantId: string, id: string, version: number) {
        await this.get(tenantId, id);
        const snapshot = await this.prisma.workflowVersion.findUnique({
            where: { workflowId_version: { workflowId: id, version } },
        });
        if (!snapshot) throw new NotFoundException("Version not found");

        const nextVersion = snapshot.version + 1;
        return this.prisma.workflow.update({
            where: { id },
            data: {
                definition: snapshot.definition as unknown as object,
                version: nextVersion,
            },
        });
    }
}
