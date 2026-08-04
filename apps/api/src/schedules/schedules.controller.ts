import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ScheduleService } from "../engine/schedule.service";

@ApiTags("schedules")
@Controller()
export class SchedulesController {
    constructor(private readonly schedules: ScheduleService) { }

    @Get("schedules")
    @ApiOperation({ summary: "List all active schedule triggers" })
    list() {
        return this.schedules.listSchedules();
    }

    @Post("schedules/:workflowId/run")
    @ApiOperation({ summary: "Trigger a schedule workflow immediately" })
    runNow(@Param("workflowId") workflowId: string) {
        return this.schedules.triggerNode(workflowId);
    }
}