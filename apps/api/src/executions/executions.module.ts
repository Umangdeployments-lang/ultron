import { Module } from "@nestjs/common";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";
import { EngineModule } from "../engine/engine.module";

@Module({
    imports: [EngineModule],
    controllers: [ExecutionsController],
    providers: [ExecutionsService],
    exports: [ExecutionsService],
})
export class ExecutionsModule { }
