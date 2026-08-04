import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { ApiKeysService, CreateApiKeyDto } from "./api-keys.service";

const DEFAULT_TENANT = "tenant_local";

@ApiTags("api-keys")
@Controller("api-keys")
export class ApiKeysController {
    constructor(private readonly service: ApiKeysService) { }

    @Get()
    @ApiOperation({ summary: "List stored API keys (values never returned)" })
    list(@Query("tenantId") tenantId?: string) {
        return this.service.list(tenantId ?? DEFAULT_TENANT);
    }

    @Post()
    @ApiOperation({ summary: "Store a BYOK provider key (encrypted at rest)" })
    create(@Body() dto: CreateApiKeyDto, @Query("tenantId") tenantId?: string) {
        return this.service.create(tenantId ?? DEFAULT_TENANT, dto);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a stored API key" })
    @ApiParam({ name: "id" })
    remove(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.remove(tenantId ?? DEFAULT_TENANT, id);
    }
}
