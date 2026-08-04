import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { WorkflowDefinition } from "@ultron/shared";

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: "starter" | "automation" | "ai" | "productivity";
    icon: string;
    definition: WorkflowDefinition;
}

const TEMPLATES: WorkflowTemplate[] = [
    {
        id: "tpl_new_lead_email",
        name: "New Lead → Welcome Email",
        description: "Webhook fires with a new lead, sends a welcome email.",
        category: "automation",
        icon: "📧",
        definition: {
            version: 1,
            nodes: [
                { id: "n1", type: "trigger", position: { x: 50, y: 100 }, data: { type: "trigger", kind: "webhook", label: "Webhook (New Lead)" } },
                { id: "n2", type: "action", position: { x: 300, y: 100 }, data: { type: "action", kind: "email", label: "Send Welcome Email", config: { to: "{{trigger.email}}", subject: "Welcome!" } } },
            ],
            edges: [{ id: "e1", source: "n1", target: "n2" }],
        },
    },
    {
        id: "tpl_daily_schedule",
        name: "Daily Summary (Cron)",
        description: "Every morning at 9am, LLM summarizes data and emails it.",
        category: "productivity",
        icon: "⏰",
        definition: {
            version: 1,
            nodes: [
                { id: "n1", type: "trigger", position: { x: 50, y: 100 }, data: { type: "trigger", kind: "schedule", label: "Every day 9am", config: { cron: "0 9 * * *" } } },
                { id: "n2", type: "ai", position: { x: 300, y: 100 }, data: { type: "ai", kind: "llm", label: "Summarize", config: { prompt: "Summarize: {{trigger.data}}" } } },
                { id: "n3", type: "action", position: { x: 550, y: 100 }, data: { type: "action", kind: "email", label: "Email Summary", config: { to: "${USER_EMAIL}", subject: "Your daily summary" } } },
            ],
            edges: [
                { id: "e1", source: "n1", target: "n2" },
                { id: "e2", source: "n2", target: "n3" },
            ],
        },
    },
    {
        id: "tpl_ai_classify",
        name: "AI Support Ticket Classifier",
        description: "LLM classifies incoming tickets by category.",
        category: "ai",
        icon: "🤖",
        definition: {
            version: 1,
            nodes: [
                { id: "n1", type: "trigger", position: { x: 50, y: 100 }, data: { type: "trigger", kind: "webhook", label: "Webhook (Ticket)" } },
                { id: "n2", type: "ai", position: { x: 300, y: 100 }, data: { type: "ai", kind: "llm", label: "Classify", config: { prompt: "Classify: {{trigger.body}}" } } },
            ],
            edges: [{ id: "e1", source: "n1", target: "n2" }],
        },
    },
    {
        id: "tpl_form_lead",
        name: "Form → Lead Capture",
        description: "Form submission becomes a lead record.",
        category: "starter",
        icon: "📝",
        definition: {
            version: 1,
            nodes: [
                { id: "n1", type: "trigger", position: { x: 50, y: 100 }, data: { type: "trigger", kind: "form", label: "Form (Lead)", config: { fields: ["name", "email", "message"] } } },
                { id: "n2", type: "action", position: { x: 300, y: 100 }, data: { type: "action", kind: "http", label: "Create Lead", config: { method: "POST", url: "${CRM_URL}", body: { name: "{{trigger.name}}", email: "{{trigger.email}}" } } } },
            ],
            edges: [{ id: "e1", source: "n1", target: "n2" }],
        },
    },
];

@Injectable()
export class TemplatesService {
    constructor(private readonly prisma: PrismaService) { }

    list() {
        return TEMPLATES.map(({ id, name, description, category, icon }) => ({ id, name, description, category, icon }));
    }

    get(id: string) {
        const tpl = TEMPLATES.find((t) => t.id === id);
        if (!tpl) throw new Error("Template not found");
        return tpl;
    }

    async instantiate(tenantId: string, templateId: string, name?: string) {
        const tpl = this.get(templateId);
        return this.prisma.workflow.create({
            data: {
                name: name ?? tpl.name,
                description: tpl.description,
                definition: tpl.definition as unknown as object,
                status: "draft",
                version: 1,
                hookPath: tpl.definition.nodes?.some((n) => n.type === "trigger" && (n.data.kind ?? "webhook") === "webhook")
                    ? `h_${crypto.randomUUID().replace(/-/g, "")}`
                    : null,
                tenantId,
            },
        });
    }
}