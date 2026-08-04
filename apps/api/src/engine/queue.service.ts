import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker } from "bullmq";
import { WorkflowRunnerService } from "./workflow-runner.service";

export interface ExecutionJobData {
    executionId: string;
    workflowId: string;
    tenantId: string;
    input: Record<string, unknown>;
}

/**
 * BullMQ-backed queue for async workflow executions.
 * Falls back to direct execution if Redis is unavailable (dev mode).
 */
@Injectable()
export class ExecutionQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ExecutionQueueService.name);
    private queue?: Queue<ExecutionJobData>;
    private worker?: Worker<ExecutionJobData>;
    private readonly redisEnabled: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly runner: WorkflowRunnerService
    ) {
        this.redisEnabled = this.config.get("REDIS_ENABLED", "true") === "true";
    }

    get isRedisEnabled(): boolean {
        return this.redisEnabled;
    }

    async onModuleInit() {
        if (!this.redisEnabled) {
            this.logger.warn("Redis disabled — executions will run synchronously.");
            return;
        }
        const host = this.config.get("REDIS_HOST", "localhost");
        const port = parseInt(this.config.get("REDIS_PORT", "6379"), 10);
        const connection = { host, port };

        this.queue = new Queue<ExecutionJobData>("ultron-executions", {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 2000 },
                removeOnComplete: 1000,
                removeOnFail: 1000,
            },
        });

        this.worker = new Worker<ExecutionJobData>(
            "ultron-executions",
            async (job) => {
                const { workflowId, tenantId, input } = job.data;
                this.logger.log(
                    `Processing execution ${job.data.executionId} for workflow ${workflowId}`
                );
                await this.runner.runWorkflow(workflowId, tenantId, input);
            },
            { connection }
        );

        this.worker.on("completed", (job) => {
            this.logger.log(`Execution ${job.id} completed`);
        });
        this.worker.on("failed", (job, err) => {
            this.logger.error(`Execution ${job?.id} failed: ${err.message}`);
        });
    }

    async enqueue(job: ExecutionJobData): Promise<{ queued: boolean; executionId: string }> {
        if (!this.queue || !this.redisEnabled) {
            // Dev fallback: run inline
            this.logger.log(
                `Running execution ${job.executionId} synchronously (no Redis)`
            );
            await this.runner.runWorkflow(job.workflowId, job.tenantId, job.input);
            return { queued: false, executionId: job.executionId };
        }
        await this.queue.add("execute", job, {
            jobId: job.executionId,
        });
        return { queued: true, executionId: job.executionId };
    }

    async onModuleDestroy() {
        await this.worker?.close();
        await this.queue?.close();
    }
}
