import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { Request } from "express";
import { WebhooksService } from "./webhooks.service";

@ApiTags("webhooks")
@Controller()
export class WebhooksController {
    constructor(private readonly service: WebhooksService) { }

    /**
     * Public webhook endpoint.
     * No tenant auth — the hookPath itself is the bearer secret.
     */
    @Post("hooks/:hookPath")
    @ApiOperation({ summary: "Receive a webhook payload → triggers the attached workflow" })
    @ApiParam({ name: "hookPath", description: "e.g. h_abc123 (from workflow creation)" })
    async handle(
        @Param("hookPath") hookPath: string,
        @Body() payload: unknown,
        @Req() _req: Request
    ) {
        try {
            const result = await this.service.handle(hookPath, payload);
            return {
                ok: true,
                executionId: result.id,
                status: result.status,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                ok: false,
                error: message,
            };
        }
    }

    @Get("workflows/:workflowId/hook")
    @ApiOperation({ summary: "Get the public webhook URL for a workflow" })
    @ApiParam({ name: "workflowId" })
    getHook(
        @Param("workflowId") workflowId: string,
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.getHookForWorkflow(tenantId ?? "tenant_local", workflowId);
    }

    @Post("workflows/:workflowId/hook/regenerate")
    @ApiOperation({ summary: "Regenerate the webhook URL for a workflow" })
    @ApiParam({ name: "workflowId" })
    regenerate(
        @Param("workflowId") workflowId: string,
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.regenerate(tenantId ?? "tenant_local", workflowId);
    }
}
