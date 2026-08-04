import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ExecutionQueueService } from "./queue.service";
import type { WorkflowDefinition } from "@ultron/shared";

const DEFAULT_CRON = "0 9 * * *";

@Injectable()
export class ScheduleService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ScheduleService.name);
    private readonly lastFired = new Map<string, string>();
    private timer?: NodeJS.Timeout;

    constructor(
        private readonly prisma: PrismaService,
        private readonly queue: ExecutionQueueService
    ) { }

    async onModuleInit() {
        await this.tick();
        this.timer = setInterval(() => this.tick().catch((e) => this.logger.error(`tick: ${e.message}`)), 30_000);
        this.logger.log("ScheduleService started (30s scan)");
    }

    async onModuleDestroy() {
        if (this.timer) clearInterval(this.timer);
    }

    async tick() {
        const wfs = await this.prisma.workflow.findMany({
            where: { status: "active" },
            select: { id: true, tenantId: true, definition: true, version: true },
        });
        const now = new Date();
        const keyMinute = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
        for (const wf of wfs) {
            const def = wf.definition as unknown as WorkflowDefinition;
            const nodes = (def?.nodes ?? []).filter((n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "schedule");
            for (const n of nodes) {
                const cfg = (n.data.config ?? {}) as { cron?: string };
                const cron = cfg.cron ?? DEFAULT_CRON;
                const key = `${wf.id}|${n.id}`;
                if (this.matches(cron, now) && this.lastFired.get(key) !== keyMinute) {
                    this.lastFired.set(key, keyMinute);
                    await this.fire(wf.id, wf.tenantId, wf.version, cron);
                }
            }
        }
    }

    private async fire(workflowId: string, tenantId: string, version: number, cron: string) {
        const input = { _scheduleCron: cron, _triggeredAt: new Date().toISOString() };
        const ex = await this.prisma.execution.create({
            data: { workflowId, tenantId, version, input, status: "queued", steps: [] },
        });
        await this.queue.enqueue({ executionId: ex.id, workflowId, tenantId, input });
        this.logger.log(`Schedule fired for ${workflowId} (${cron})`);
    }

    private matches(expr: string, date: Date): boolean {
        const parts = expr.trim().split(/\s+/);
        if (parts.length !== 5) return false;
        return (
            this.inRange(parts[0], 0, 59, date.getMinutes()) &&
            this.inRange(parts[1], 0, 23, date.getHours()) &&
            this.inRange(parts[2], 1, 31, date.getDate()) &&
            this.inRange(parts[3], 1, 12, date.getMonth() + 1) &&
            this.inRange(parts[4], 0, 6, date.getDay())
        );
    }

    private inRange(field: string, lo: number, hi: number, val: number): boolean {
        if (field === "*") return true;
        if (field.includes(",")) return field.split(",").some((f) => this.inRange(f, lo, hi, val));
        if (field.includes("/")) {
            const [base, stepStr] = field.split("/");
            const step = parseInt(stepStr, 10);
            const start = base === "*" ? lo : parseInt(base, 10);
            if (!isNaN(start) && !isNaN(step) && val >= start && (val - start) % step === 0) return true;
            return false;
        }
        if (field.includes("-")) {
            const [a, b] = field.split("-").map((v) => parseInt(v, 10));
            if (!isNaN(a) && !isNaN(b)) return val >= a && val <= b;
        }
        return parseInt(field, 10) === val;
    }

    async listSchedules() {
        const wfs = await this.prisma.workflow.findMany({
            where: { status: "active" },
            select: { id: true, name: true, tenantId: true, definition: true },
        });
        const out: Array<{ workflowId: string; workflowName: string; cron: string; nodeId: string }> = [];
        for (const wf of wfs) {
            const def = wf.definition as unknown as WorkflowDefinition;
            const nodes = (def?.nodes ?? []).filter(
                (n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "schedule"
            );
            for (const n of nodes) {
                const cfg = (n.data.config ?? {}) as { cron?: string };
                out.push({
                    workflowId: wf.id,
                    workflowName: wf.name,
                    cron: cfg.cron ?? DEFAULT_CRON,
                    nodeId: n.id,
                });
            }
        }
        return out;
    }

    async triggerNode(workflowId: string) {
        const wf = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
        if (!wf) return { ok: false, error: "Workflow not found" };
        const def = wf.definition as unknown as WorkflowDefinition;
        const node = (def?.nodes ?? []).find(
            (n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "schedule"
        );
        if (!node) return { ok: false, error: "No schedule trigger node" };
        const cfg = (node.data.config ?? {}) as { cron?: string };
        await this.fire(wf.id, wf.tenantId, wf.version, cfg.cron ?? DEFAULT_CRON);
        return { ok: true };
    }
}