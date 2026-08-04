// ============================================
// Ultron Workflow Core Types
// The shared contract between frontend canvas,
// backend API, and the execution engine.
// ============================================

export type NodeType =
    | "trigger"
    | "action"
    | "ai"
    | "approval"
    | "condition"
    | "code"
    | "delay"
    | "filter"
    | "set"
    | "merge"
    | "split"
    | "loop"
    | "subworkflow"
    | "error_handler"
    | "transform";

export type NodeCategory = "Triggers" | "Actions" | "AI & Logic" | "Data";

export type TriggerKind = "webhook" | "schedule" | "email" | "form";
export type ActionKind = "email" | "http" | "slack" | "webhook_out" | "database";
export type AIModelProvider = "gemini" | "openai" | "anthropic" | "custom";

export type KeyMode = "platform" | "custom";

// ---- Graph model (matches React Flow JSON) ----
export interface WorkflowPosition {
    x: number;
    y: number;
}

export interface WorkflowNodeData {
    label: string;
    type: NodeType;
    [key: string]: unknown;
}

export interface WorkflowEdgeData {
    label?: string;
}

// Trigger Node configs
export interface WebhookTriggerConfig {
    /** Public path suffix after /hooks/ */
    hookPath: string;
    method: "GET" | "POST" | "PUT" | "PATCH";
    /** Optional JSON schema filter for the payload */
    filters?: Record<string, unknown>;
}

export interface ScheduleTriggerConfig {
    cron: string;
    timezone?: string;
}

export interface EmailTriggerConfig {
    address: string;
    /** e.g. invoices@ or support@ */
    mailbox: string;
}

// Action Node configs
export interface EmailActionConfig {
    to: string;
    subject: string;
    body: string;
    /** Reference previous node output with {{nodeId.field}} or {{nodeId}} */
    fromTemplate?: boolean;
}

export interface HttpActionConfig {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
}

// AI Node configs
export interface AINodeConfig {
    provider: AIModelProvider;
    keyMode: KeyMode;
    /** When keyMode === "custom", which stored custom key to use */
    customKeyId?: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
    /** Ask the LLM to respond in strict JSON matching this schema */
    responseSchema?: Record<string, unknown>;
}

// Approval Node configs
export interface ApprovalNodeConfig {
    approvers: string[];
    message: string;
    /** Timeout in minutes; null = wait forever */
    timeoutMinutes?: number;
    channels: Array<"email" | "slack">;
}

export interface ConditionNodeConfig {
    field: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "exists";
    value?: unknown;
}

export interface DelayNodeConfig {
    seconds: number;
}

export interface CodeNodeConfig {
    /** Sandboxed JS function body: (input) => output */
    code: string;
    language: "javascript";
}

// ---- Filter Node ----
export interface FilterNodeConfig {
    /** Condition to filter on */
    condition: {
        field: string;
        operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "exists";
        value?: unknown;
    };
    /** What to do with items that don't match */
    discardMode: "drop" | "route_to_error";
}

// ---- Set Node (data transformation) ----
export interface SetNodeConfig {
    /** Key-value pairs to set on the data object */
    values: Record<string, string>;
    /** If true, merge with existing data; if false, replace entirely */
    merge: boolean;
}

// ---- Merge Node ----
export interface MergeNodeConfig {
    /** How to combine inputs from multiple branches */
    mode: "append" | "combine" | "zip";
    /** Key to use when combining objects */
    resultKey: string;
}

// ---- Split Node (split array into individual items) ----
export interface SplitNodeConfig {
    /** The field containing the array to split */
    field: string;
    /** Maximum items to process per batch (0 = no limit) */
    batchSize: number;
}

// ---- Loop Node ----
export interface LoopNodeConfig {
    /** The field containing the array to iterate over */
    field: string;
    /** Maximum iterations (0 = no limit) */
    maxIterations: number;
}

// ---- Sub-workflow Node ----
export interface SubWorkflowNodeConfig {
    /** ID of the target workflow to invoke */
    targetWorkflowId: string;
    /** Mapping of input fields from current execution to target workflow */
    inputMapping: Record<string, string>;
}

// ---- Error Handler Node ----
export interface ErrorHandlerNodeConfig {
    /** What to do when an error occurs */
    action: "retry" | "continue" | "stop";
    /** Number of retry attempts (for retry action) */
    retryCount: number;
    /** Delay between retries in seconds */
    retryDelay: number;
}

// ---- Transform Node (map/filter/reduce) ----
export interface TransformNodeConfig {
    /** JavaScript expression to transform each item */
    expression: string;
    /** Input field to transform */
    inputField: string;
    /** Output field to write result to */
    outputField: string;
}

export interface WorkflowNode {
    id: string;
    type: string;
    position: WorkflowPosition;
    data: WorkflowNodeData;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    data?: WorkflowEdgeData;
}

export interface WorkflowDefinition {
    version: number;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    /** Map of node id → config pulled from data */
    configs?: Record<string, NodeConfigUnion>;
}

export type NodeConfigUnion =
    | WebhookTriggerConfig
    | ScheduleTriggerConfig
    | EmailTriggerConfig
    | EmailActionConfig
    | HttpActionConfig
    | AINodeConfig
    | ApprovalNodeConfig
    | ConditionNodeConfig
    | DelayNodeConfig
    | CodeNodeConfig
    | FilterNodeConfig
    | SetNodeConfig
    | MergeNodeConfig
    | SplitNodeConfig
    | LoopNodeConfig
    | SubWorkflowNodeConfig
    | ErrorHandlerNodeConfig
    | TransformNodeConfig;
