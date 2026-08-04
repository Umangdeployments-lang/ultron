import { Module } from "@nestjs/common";
import { GraphExecutorService } from "./graph-executor.service";
import { LLMService } from "./llm.service";
import { EmailService } from "./email.service";
import { TemplateService } from "./template.service";
import { EncryptionService } from "./encryption.service";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { ExecutionQueueService } from "./queue.service";
import { ScheduleService } from "./schedule.service";

@Module({
    providers: [
        GraphExecutorService,
        LLMService,
        EmailService,
        TemplateService,
        EncryptionService,
        WorkflowRunnerService,
        ExecutionQueueService,
        ScheduleService,
    ],
    exports: [
        GraphExecutorService,
        LLMService,
        EmailService,
        TemplateService,
        EncryptionService,
        WorkflowRunnerService,
        ExecutionQueueService,
        ScheduleService,
    ],
})
export class EngineModule { }