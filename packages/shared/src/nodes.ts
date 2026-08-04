// ============================================
// Ultron Node Registry
// The catalog of every node type available in
// the canvas. Frontend uses this to render the
// palette + node config panels; backend uses it
// to validate and execute.
// ============================================

import type {
    NodeCategory,
    NodeType,
    ActionKind,
    TriggerKind,
} from "./workflow";

export interface NodeDefinition {
    type: NodeType;
    kind: string;
    label: string;
    category: NodeCategory;
    description: string;
    icon: string;
    color: string;
    /** Default data for a freshly-dropped node */
    defaults: Record<string, unknown>;
    inputs: number;
    outputs: number;
    /** True if a node's output feeds downstream nodes */
    hasOutput: boolean;
    /** True if it can receive upstream data */
    hasInput: boolean;
    /** For triggers: what kind of trigger */
    triggerKind?: TriggerKind;
    /** For actions: what kind of action */
    actionKind?: ActionKind;
}

export const NODE_REGISTRY: NodeDefinition[] = [
    // =============== TRIGGERS ===============
    {
        type: "trigger",
        kind: "webhook",
        label: "Webhook",
        category: "Triggers",
        description:
            "Receive HTTP requests. Get a public URL that fires this workflow with any JSON payload.",
        icon: "⚡",
        color: "#8b5cf6",
        defaults: {
            hookPath: "",
            method: "POST",
            filters: {},
        },
        hasOutput: true,
        hasInput: false,
        inputs: 0,
        outputs: 1,
        triggerKind: "webhook",
    },
    {
        type: "trigger",
        kind: "schedule",
        label: "Schedule",
        category: "Triggers",
        description: "Run the workflow on a cron schedule (e.g. every day at 9am).",
        icon: "🕐",
        color: "#8b5cf6",
        defaults: {
            cron: "0 9 * * *",
            timezone: "UTC",
        },
        hasOutput: true,
        hasInput: false,
        inputs: 0,
        outputs: 1,
        triggerKind: "schedule",
    },
    {
        type: "trigger",
        kind: "email",
        label: "Inbound Email",
        category: "Triggers",
        description: "Trigger when an email lands in a monitored inbox.",
        icon: "📬",
        color: "#8b5cf6",
        defaults: {
            mailbox: "invoices",
        },
        hasOutput: true,
        hasInput: false,
        inputs: 0,
        outputs: 1,
        triggerKind: "email",
    },
    {
        type: "trigger",
        kind: "form",
        label: "Form",
        category: "Triggers",
        description: "Trigger when a web form is submitted. Generates a hosted form URL.",
        icon: "📝",
        color: "#8b5cf6",
        defaults: {
            fields: [],
        },
        hasOutput: true,
        hasInput: false,
        inputs: 0,
        outputs: 1,
        triggerKind: "form",
    },

    // =============== AI & LOGIC ===============
    {
        type: "ai",
        kind: "ai-agent",
        label: "AI Agent",
        category: "AI & Logic",
        description:
            "Send data to a large language model (Gemini, OpenAI, Anthropic) with your own prompt. Returns structured output.",
        icon: "🧠",
        color: "#f59e0b",
        defaults: {
            provider: "gemini",
            keyMode: "platform",
            model: "gemini-1.5-flash",
            systemPrompt: "You are a helpful AI assistant.",
            userPrompt: "Here is the input: {{input}}",
            temperature: 0.7,
            maxTokens: 2048,
            responseSchema: {},
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "condition",
        kind: "condition",
        label: "Condition",
        category: "AI & Logic",
        description:
            "Branch the workflow based on a field comparison. True → output A, False → output B.",
        icon: "🔀",
        color: "#f59e0b",
        defaults: {
            field: "",
            operator: "eq",
            value: "",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 2,
    },
    {
        type: "approval",
        kind: "approval",
        label: "Approval Gate",
        category: "AI & Logic",
        description:
            "Pause execution until a human approves or rejects. Resume instantly via email/Slack links.",
        icon: "✅",
        color: "#ef4444",
        defaults: {
            approvers: [],
            message: "Please approve this workflow step.",
            timeoutMinutes: null,
            channels: ["email"],
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "delay",
        kind: "delay",
        label: "Delay",
        category: "AI & Logic",
        description: "Wait a fixed number of seconds before continuing.",
        icon: "⏳",
        color: "#f59e0b",
        defaults: {
            seconds: 60,
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "code",
        kind: "code",
        label: "Code",
        category: "AI & Logic",
        description: "Run custom JavaScript in a sandbox to transform your data.",
        icon: "💻",
        color: "#f59e0b",
        defaults: {
            code: "return input;",
            language: "javascript",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },

    // =============== ACTIONS ===============
    {
        type: "action",
        kind: "email",
        label: "Send Email",
        category: "Actions",
        description: "Send an email. Use {{nodeId.field}} templates to inject previous outputs.",
        icon: "✉️",
        color: "#10b981",
        defaults: {
            to: "",
            subject: "",
            body: "",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
        actionKind: "email",
    },
    {
        type: "action",
        kind: "http",
        label: "HTTP Request",
        category: "Actions",
        description: "Call any REST API — the universal connector for thousands of apps.",
        icon: "🌐",
        color: "#10b981",
        defaults: {
            method: "POST",
            url: "",
            headers: {},
            body: {},
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
        actionKind: "http",
    },
    {
        type: "action",
        kind: "slack",
        label: "Slack",
        category: "Actions",
        description: "Post a message to a Slack channel or DM.",
        icon: "💬",
        color: "#10b981",
        defaults: {
            channel: "#general",
            text: "",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
        actionKind: "slack",
    },
    {
        type: "action",
        kind: "webhook_out",
        label: "Outbound Webhook",
        category: "Actions",
        description: "Send the payload to an external service using their webhook URL.",
        icon: "🔗",
        color: "#10b981",
        defaults: {
            url: "",
            method: "POST",
            headers: {},
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
        actionKind: "webhook_out",
    },
    {
        type: "action",
        kind: "database",
        label: "Database",
        category: "Actions",
        description: "Insert, update, or query rows in the built-in database. Store structured data from any workflow.",
        icon: "🗄️",
        color: "#10b981",
        defaults: {
            operation: "insert",
            table: "",
            data: {},
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
        actionKind: "database",
    },

    // =============== ZAPIER/N8N FEATURES ===============
    {
        type: "filter",
        kind: "filter",
        label: "Filter",
        category: "AI & Logic",
        description:
            "Filter data based on a condition. Only matching items continue down the true branch.",
        icon: "🔍",
        color: "#8b5cf6",
        defaults: {
            condition: { field: "", operator: "eq", value: "" },
            discardMode: "drop",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 2,
    },
    {
        type: "set",
        kind: "set",
        label: "Set",
        category: "AI & Logic",
        description:
            "Set or transform key-value pairs on the data object. Supports template expressions.",
        icon: "✏️",
        color: "#8b5cf6",
        defaults: {
            values: {},
            merge: true,
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "merge",
        kind: "merge",
        label: "Merge",
        category: "AI & Logic",
        description:
            "Combine data from multiple branches into a single output.",
        icon: "🔀",
        color: "#8b5cf6",
        defaults: {
            mode: "append",
            resultKey: "results",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 2,
        outputs: 1,
    },
    {
        type: "split",
        kind: "split",
        label: "Split In Batches",
        category: "AI & Logic",
        description:
            "Split an array into individual items or smaller batches for processing.",
        icon: "📦",
        color: "#8b5cf6",
        defaults: {
            field: "items",
            batchSize: 1,
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "loop",
        kind: "loop",
        label: "Loop",
        category: "AI & Logic",
        description:
            "Iterate over an array field, processing each item through the loop body.",
        icon: "🔁",
        color: "#8b5cf6",
        defaults: {
            field: "items",
            maxIterations: 100,
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "subworkflow",
        kind: "subworkflow",
        label: "Sub-Workflow",
        category: "AI & Logic",
        description:
            "Invoke another workflow and pass data to it. Useful for reusable automation blocks.",
        icon: "📋",
        color: "#8b5cf6",
        defaults: {
            targetWorkflowId: "",
            inputMapping: {},
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "error_handler",
        kind: "error_handler",
        label: "Error Handler",
        category: "AI & Logic",
        description:
            "Handle errors from upstream nodes with retry, continue, or stop actions.",
        icon: "🛡️",
        color: "#ef4444",
        defaults: {
            action: "continue",
            retryCount: 3,
            retryDelay: 5,
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
    {
        type: "transform",
        kind: "transform",
        label: "Transform",
        category: "AI & Logic",
        description:
            "Apply a JavaScript expression to transform each item in an array or object.",
        icon: "⚡",
        color: "#f59e0b",
        defaults: {
            expression: "item",
            inputField: "data",
            outputField: "result",
        },
        hasOutput: true,
        hasInput: true,
        inputs: 1,
        outputs: 1,
    },
];

export function getNodeDefinition(
    type: NodeType,
    kind?: string
): NodeDefinition | undefined {
    if (kind) {
        return NODE_REGISTRY.find((d) => d.type === type && d.kind === kind);
    }
    return NODE_REGISTRY.find((d) => d.type === type);
}

export const NODE_CATEGORIES: NodeCategory[] = [
    "Triggers",
    "Actions",
    "AI & Logic",
    "Data",
];
