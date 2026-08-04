import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "./prisma/prisma.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { ExecutionsModule } from "./executions/executions.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { EngineModule } from "./engine/engine.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env", "../../.env"],
        }),
        PrismaModule,
        EngineModule,
        WorkflowsModule,
        ExecutionsModule,
        WebhooksModule,
        ApiKeysModule,
        ApprovalsModule,
        SchedulesModule,
        TemplatesModule,
    ],
})
export class AppModule { }