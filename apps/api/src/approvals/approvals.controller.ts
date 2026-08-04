import { Controller, Get, Param, Query, Redirect } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { ApprovalsService } from "./approvals.service";

const DEFAULT_TENANT = "tenant_local";

@ApiTags("approvals")
@Controller()
export class ApprovalsController {
    constructor(private readonly service: ApprovalsService) { }

    @Get("approvals/pending")
    @ApiOperation({ summary: "List all pending approvals for a tenant" })
    listPending(@Query("tenantId") tenantId?: string) {
        return this.service.listPending(tenantId ?? DEFAULT_TENANT);
    }

    @Get("approvals/:id")
    @ApiOperation({ summary: "Get a single approval with execution context" })
    @ApiParam({ name: "id" })
    get(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
        return this.service.get(tenantId ?? DEFAULT_TENANT, id);
    }

    @Get("executions/:executionId/approvals")
    @ApiOperation({ summary: "List approvals for an execution" })
    @ApiParam({ name: "executionId" })
    listForExecution(
        @Param("executionId") executionId: string,
        @Query("tenantId") tenantId?: string
    ) {
        return this.service.listForExecution(tenantId ?? DEFAULT_TENANT, executionId);
    }

    /**
     * Public email-link endpoints — the token is the secret.
     * Redirects to the dashboard view after deciding.
     */
    @Get("approvals/:token/approve")
    @ApiOperation({ summary: "Approve via email link (public, token = secret)" })
    @ApiParam({ name: "token" })
    @Redirect()
    async approve(@Param("token") token: string) {
        const result = await this.service.decideByToken(token, "approved");
        return {
            url: result.ok
                ? "/approvals?outcome=approved"
                : `/approvals?outcome=error&msg=${encodeURIComponent(
                    "error" in result && result.error ? result.error : "Unknown error"
                )}`,
            statusCode: 302,
        };
    }

    @Get("approvals/:token/reject")
    @ApiOperation({ summary: "Reject via email link (public, token = secret)" })
    @ApiParam({ name: "token" })
    @Redirect()
    async reject(@Param("token") token: string) {
        const result = await this.service.decideByToken(token, "rejected");
        return {
            url: result.ok
                ? "/approvals?outcome=rejected"
                : `/approvals?outcome=error&msg=${encodeURIComponent(
                    "error" in result && result.error ? result.error : "Unknown error"
                )}`,
            statusCode: 302,
        };
    }
}
