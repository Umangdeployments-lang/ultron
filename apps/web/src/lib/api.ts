"use client";

/**
 * Lightweight API client for the ultron backend.
 * Frontend runs on :3000, API on :4000 (proxied via /api rewrite in next.config).
 */

const BASE = "/api";
const TENANT = "tenant_local";

export interface WorkflowDTO {
    id: string;
    name: string;
    description?: string | null;
    status: "draft" | "active" | "paused" | "archived";
    version: number;
    hookPath?: string | null;
    definition: {
        nodes: unknown[];
        edges: unknown[];
        version: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface ExecutionDTO {
    id: string;
    workflowId: string;
    version: number;
    status:
    | "queued"
    | "running"
    | "waiting_approval"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "timed_out";
    input: Record<string, unknown>;
    output?: Record<string, unknown> | null;
    steps: unknown[];
    error?: string | null;
    startedAt: string;
    finishedAt?: string | null;
    createdAt: string;
    workflow?: { name: string };
}

export interface ApiKeyDTO {
    id: string;
    name: string;
    provider: string;
    createdAt: string;
}

export interface ApprovalDTO {
    id: string;
    executionId: string;
    nodeId: string;
    message: string;
    status: "pending" | "approved" | "rejected";
    token: string;
    createdAt: string;
    execution?: {
        id: string;
        workflowId: string;
        status: string;
        workflow?: { name: string };
    };
}

async function request<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(
            `API ${res.status}: ${text.length > 200 ? text.slice(0, 200) + "…" : text}`
        );
    }

    return res.json() as Promise<T>;
}

export const api = {
    // Workflows
    listWorkflows: () =>
        request<WorkflowDTO[]>(`/workflows?tenantId=${TENANT}`),

    createWorkflow: (data: {
        name: string;
        description?: string;
        definition?: unknown;
    }) =>
        request<WorkflowDTO>(
            `/workflows?tenantId=${TENANT}`,
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        ),

    updateWorkflow: (id: string, data: Record<string, unknown>) =>
        request<WorkflowDTO>(
            `/workflows/${id}?tenantId=${TENANT}`,
            {
                method: "PATCH",
                body: JSON.stringify(data),
            }
        ),

    publishWorkflow: (id: string) =>
        request<WorkflowDTO>(
            `/workflows/${id}/publish?tenantId=${TENANT}`,
            { method: "POST", body: JSON.stringify({}) }
        ),

    deleteWorkflow: (id: string) =>
        request<{ ok: boolean }>(
            `/workflows/${id}?tenantId=${TENANT}`,
            { method: "DELETE" }
        ),

    getWorkflowHook: (workflowId: string) =>
        request<{ workflowId: string; hookPath: string | null; url: string | null }>(
            `/workflows/${workflowId}/hook?tenantId=${TENANT}`
        ),

    // Executions
    listExecutions: (workflowId?: string) =>
        request<ExecutionDTO[]>(
            `/executions?tenantId=${TENANT}${workflowId ? `&workflowId=${workflowId}` : ""
            }`
        ),

    getExecution: (id: string) =>
        request<ExecutionDTO>(`/executions/${id}?tenantId=${TENANT}`),

    getExecutionSteps: (id: string) =>
        request<unknown[]>(`/executions/${id}/steps?tenantId=${TENANT}`),

    triggerWorkflow: (workflowId: string, input: Record<string, unknown>) =>
        request<{ executionId: string; status: string }>(
            `/executions?tenantId=${TENANT}`,
            {
                method: "POST",
                body: JSON.stringify({ workflowId, input }),
            }
        ),

    // API Keys
    listApiKeys: () =>
        request<ApiKeyDTO[]>(`/api-keys?tenantId=${TENANT}`),

    createApiKey: (data: {
        name: string;
        provider: "gemini" | "openai" | "anthropic" | "custom";
        keyValue: string;
    }) =>
        request<ApiKeyDTO>(
            `/api-keys?tenantId=${TENANT}`,
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        ),

    deleteApiKey: (id: string) =>
        request<{ ok: boolean }>(
            `/api-keys/${id}?tenantId=${TENANT}`,
            { method: "DELETE" }
        ),

    // Approvals
    listPendingApprovals: () =>
        request<ApprovalDTO[]>(`/approvals/pending?tenantId=${TENANT}`),
};
