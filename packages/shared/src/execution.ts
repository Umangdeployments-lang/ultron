// ============================================
// Ultranomous Execution Types
// Runtime state models for workflow executions
// ============================================

export type ExecutionStatus =
    | "queued"
    | "running"
    | "waiting_approval"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "timed_out";

export type StepStatus =
    | "pending"
    | "running"
    | "succeeded"
    | "failed"
    | "skipped"
    | "waiting_approval";

export interface ExecutionContext {
    /** Input payload passed to the workflow (e.g. webhook body) */
    input: Record<string, unknown>;
    /** Map of nodeId → node output (built up as steps complete) */
    nodeOutputs: Record<string, unknown>;
    /** Variables set during run (e.g. from code nodes) */
    variables: Record<string, unknown>;
}

export interface ExecutionStepTrace {
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    status: StepStatus;
    startedAt: string;
    finishedAt?: string;
    durationMs?: number;
    input?: unknown;
    output?: unknown;
    error?: {
        message: string;
        stack?: string;
    };
    /** e.g. tokens used by an AI node */
    metadata?: Record<string, unknown>;
    /** For approval nodes: who approved, when */
    approval?: {
        outcome: "approved" | "rejected";
        by: string;
        at: string;
        note?: string;
    };
}

export interface ExecutionDTO {
    id: string;
    workflowId: string;
    workflowVersion: number;
    status: ExecutionStatus;
    input: Record<string, unknown>;
    output?: unknown;
    steps: ExecutionStepTrace[];
    error?: string;
    startedAt: string;
    finishedAt?: string;
    /** Approximate cost in USD (AI tokens etc.) */
    estimatedCostUsd?: number;
    tenantId: string;
}

export interface ApprovalRequestDTO {
    id: string;
    executionId: string;
    workflowId: string;
    nodeId: string;
    status: "pending" | "approved" | "rejected";
    message: string;
    createdAt: string;
    decidedAt?: string;
    decidedBy?: string;
}
