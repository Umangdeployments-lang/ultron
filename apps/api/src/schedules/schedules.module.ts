import { Module } from "@nestjs/common";
import { EngineModule } from "../engine/engine.module";
import { SchedulesController } from "./schedules.controller";

@Module({
    imports: [EngineModule],
    controllers: [SchedulesController],
})
export class SchedulesModule { }