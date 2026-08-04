import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { TemplatesService } from "./templates.service";

const DEFAULT_TENANT = "tenant_local";

@ApiTags("templates")
@Controller("templates")
export class TemplatesController {
    constructor(private readonly service: TemplatesService) { }

    @Get()
    @ApiOperation({ summary: "List all workflow templates" })
    list() {
        return this.service.list();
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single template" })
    get(@Param("id") id: string) {
        return this.service.get(id);
    }

    @Post(":id/instantiate")
    @ApiOperation({ summary: "Create a workflow from a template" })
    instantiate(
        @Param("id") id: string,
        @Body() body: { name?: string },
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.instantiate(tenantId ?? DEFAULT_TENANT, id, body?.name);
    }
}