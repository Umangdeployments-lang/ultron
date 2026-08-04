// ============================================
// Ultranomous Zod Validation Schemas
// Used by both the frontend (form validation)
// and the backend (workflow publish validation).
// ============================================

import { z } from "zod";

// ---------- Position ----------
export const positionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

// ---------- Node data ----------
export const nodeDataSchema = z
    .object({
        label: z.string(),
        type: z.string(),
        kind: z.string().optional(),
        config: z.record(z.unknown()).optional(),
    })
    .passthrough();

export const workflowNodeSchema = z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    position: positionSchema,
    data: nodeDataSchema,
});

// ---------- Edge ----------
export const workflowEdgeSchema = z.object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    data: z
        .object({
            label: z.string().optional(),
        })
        .optional(),
});

// ---------- Webhook Trigger ----------
export const webhookTriggerConfigSchema = z.object({
    hookPath: z.string().min(1),
    method: z.enum(["GET", "POST", "PUT", "PATCH"]),
    filters: z.record(z.unknown()).optional(),
});

// ---------- AI Node ----------
export const aiNodeConfigSchema = z.object({
    provider: z.enum(["gemini", "openai", "anthropic", "custom"]),
    keyMode: z.enum(["platform", "custom"]),
    customKeyId: z.string().optional(),
    model: z.string().min(1),
    systemPrompt: z.string(),
    userPrompt: z.string(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().positive().default(2048),
    responseSchema: z.record(z.unknown()).optional(),
});

// ---------- Email Action ----------
export const emailActionConfigSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string(),
    fromTemplate: z.boolean().optional(),
});

// ---------- Full workflow ----------
export const workflowDefinitionSchema = z.object({
    version: z.number().int().default(1),
    nodes: z.array(workflowNodeSchema).min(1),
    edges: z.array(workflowEdgeSchema),
});

// ---------- Workflow create/update API ----------
export const createWorkflowSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    definition: workflowDefinitionSchema,
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

// ---------- API Key ----------
export const apiKeySchema = z.object({
    name: z.string().min(1).max(100),
    provider: z.enum(["gemini", "openai", "anthropic", "custom"]),
    keyValue: z.string().min(1),
});

// ---------- Execution ----------
export const webhookExecutionSchema = z.object({
    workflowId: z.string().min(1),
    payload: z.record(z.unknown()),
});

// ---------- Filter Node ----------
export const filterNodeConfigSchema = z.object({
    condition: z.object({
        field: z.string().min(1),
        operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "exists"]),
        value: z.unknown().optional(),
    }),
    discardMode: z.enum(["drop", "route_to_error"]),
});

// ---------- Set Node ----------
export const setNodeConfigSchema = z.object({
    values: z.record(z.string()),
    merge: z.boolean().default(true),
});

// ---------- Merge Node ----------
export const mergeNodeConfigSchema = z.object({
    mode: z.enum(["append", "combine", "zip"]),
    resultKey: z.string(),
});

// ---------- Split Node ----------
export const splitNodeConfigSchema = z.object({
    field: z.string().min(1),
    batchSize: z.number().int().positive().default(1),
});

// ---------- Loop Node ----------
export const loopNodeConfigSchema = z.object({
    field: z.string().min(1),
    maxIterations: z.number().int().positive().default(100),
});

// ---------- Sub-Workflow Node ----------
export const subWorkflowNodeConfigSchema = z.object({
    targetWorkflowId: z.string().min(1),
    inputMapping: z.record(z.string()),
});

// ---------- Error Handler Node ----------
export const errorHandlerNodeConfigSchema = z.object({
    action: z.enum(["retry", "continue", "stop"]),
    retryCount: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().min(1).max(300).default(5),
});

// ---------- Transform Node ----------
export const transformNodeConfigSchema = z.object({
    expression: z.string().min(1),
    inputField: z.string(),
    outputField: z.string(),
});
