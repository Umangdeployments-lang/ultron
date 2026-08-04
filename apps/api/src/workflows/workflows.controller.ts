import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { WorkflowsService, CreateWorkflowDto, UpdateWorkflowDto } from "./workflows.service";

// In Phase 1, the tenant is read from a query param.
// Real auth (JWT) is a Phase 2 concern; this keeps the API testable today.
const DEFAULT_TENANT = "tenant_local";

@ApiTags("workflows")
@Controller("workflows")
export class WorkflowsController {
    constructor(private readonly service: WorkflowsService) { }

    @Get()
    @ApiOperation({ summary: "List all workflows for a tenant" })
    list(@Query("tenantId") tenantId?: string) {
        return this.service.list(tenantId ?? DEFAULT_TENANT);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single workflow" })
    @ApiParam({ name: "id" })
    get(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.get(tenantId ?? DEFAULT_TENANT, id);
    }

    @Post()
    @ApiOperation({ summary: "Create a workflow" })
    create(@Body() dto: CreateWorkflowDto, @Query("tenantId") tenantId?: string) {
        return this.service.create(tenantId ?? DEFAULT_TENANT, dto);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a workflow (name, definition, status)" })
    @ApiParam({ name: "id" })
    update(
        @Param("id") id: string,
        @Body() dto: UpdateWorkflowDto,
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.update(tenantId ?? DEFAULT_TENANT, id, dto);
    }

    @Post(":id/publish")
    @ApiOperation({ summary: "Publish a workflow → creates immutable version snapshot" })
    @ApiParam({ name: "id" })
    publish(
        @Param("id") id: string,
        @Body() body: { changeNote?: string },
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.publish(tenantId ?? DEFAULT_TENANT, id, body?.changeNote);
    }

    @Post(":id/rollback/:version")
    @ApiOperation({ summary: "Rollback to a previous version" })
    @ApiParam({ name: "id" })
    @ApiParam({ name: "version" })
    rollback(
        @Param("id") id: string,
        @Param("version") version: string,
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.rollback(tenantId ?? DEFAULT_TENANT, id, Number(version));
    }

    @Get(":id/versions")
    @ApiOperation({ summary: "List version history" })
    @ApiParam({ name: "id" })
    versions(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.versions(tenantId ?? DEFAULT_TENANT, id);
    }

    @Post(":id/duplicate")
    @ApiOperation({ summary: "Duplicate a workflow" })
    duplicate(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.duplicate(tenantId ?? DEFAULT_TENANT, id);
    }

    @Get(":id/export")
    @ApiOperation({ summary: "Export a workflow as JSON" })
    exportJson(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.exportJson(tenantId ?? DEFAULT_TENANT, id);
    }

    @Post("import")
    @ApiOperation({ summary: "Import a workflow from JSON" })
    importJson(@Body() payload: { name?: string; definition: import("@ultron/shared").WorkflowDefinition; description?: string }, @Query("tenantId") tenantId?: string) {
        return this.service.importJson(tenantId ?? DEFAULT_TENANT, payload);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a workflow" })
    @ApiParam({ name: "id" })
    remove(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.delete(tenantId ?? DEFAULT_TENANT, id);
    }
}
