import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { ExecutionsService } from "./executions.service";

const DEFAULT_TENANT = "tenant_local";

@ApiTags("executions")
@Controller("executions")
export class ExecutionsController {
    constructor(private readonly service: ExecutionsService) { }

    @Get()
    @ApiOperation({ summary: "List executions (optionally filtered by workflow)" })
    list(
        @Query("tenantId") tenantId?: string,
        @Query("workflowId") workflowId?: string,
        @Query("limit") limit?: string
    ) {
        return this.service.list(
            tenantId ?? DEFAULT_TENANT,
            workflowId,
            limit ? Number(limit) : 50
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single execution with full details" })
    @ApiParam({ name: "id" })
    get(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.get(tenantId ?? DEFAULT_TENANT, id);
    }

    @Get(":id/steps")
    @ApiOperation({ summary: "Get the step-by-step trace of an execution" })
    @ApiParam({ name: "id" })
    steps(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.steps(tenantId ?? DEFAULT_TENANT, id);
    }

    @Post()
    @ApiOperation({ summary: "Manually trigger a workflow" })
    trigger(
        @Body() body: { workflowId: string; input?: Record<string, unknown> },
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.trigger(
            tenantId ?? DEFAULT_TENANT,
            body.workflowId,
            body.input ?? {}
        );
    }

    @Post(":id/retry")
    @ApiOperation({ summary: "Retry a failed execution" })
    @ApiParam({ name: "id" })
    retry(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.retry(tenantId ?? DEFAULT_TENANT, id);
    }

    @Post(":id/cancel")
    @ApiOperation({ summary: "Cancel a queued/running execution" })
    @ApiParam({ name: "id" })
    cancel(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.cancel(tenantId ?? DEFAULT_TENANT, id);
    }
}
