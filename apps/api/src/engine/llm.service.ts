import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AINodeConfig } from "@ultron/shared";

export interface LLMResult {
    text: string;
    json?: unknown;
    tokensUsed?: number;
    costUsd?: number;
}

/** Provider-agnostic LLM gateway with dual-key model (platform vs BYOK). */
@Injectable()
export class LLMService {
    private readonly logger = new Logger(LLMService.name);
    constructor(private readonly config: ConfigService) { }

    async generate(
        cfg: AINodeConfig,
        userInput: string,
        customKey?: string
    ): Promise<LLMResult> {
        const key =
            cfg.keyMode === "custom"
                ? customKey
                : this.platformKey(cfg.provider);
        if (!key) {
            throw new Error(
                cfg.keyMode === "custom"
                    ? "No custom API key. Add it in Settings → API Keys."
                    : `No platform key for ${cfg.provider}. Set ${cfg.provider.toUpperCase()}_API_KEY.`
            );
        }
        try {
            switch (cfg.provider) {
                case "gemini":
                    return await this.gemini(cfg, userInput, key);
                case "openai":
                    return await this.openai(cfg, userInput, key);
                case "anthropic":
                    return await this.anthropic(cfg, userInput, key);
                default:
                    throw new Error(`Unsupported provider: ${cfg.provider}`);
            }
        } catch (err) {
            this.logger.error(`LLM call failed: ${err instanceof Error ? err.message : err}`);
            throw err;
        }
    }

    private platformKey(provider: string): string | undefined {
        return this.config.get(`${provider.toUpperCase()}_API_KEY`) ?? undefined;
    }

    private wantsJson(cfg: AINodeConfig): boolean {
        return !!cfg.responseSchema && Object.keys(cfg.responseSchema).length > 0;
    }

    private buildUserPrompt(cfg: AINodeConfig, input: string): string {
        const schema = this.wantsJson(cfg)
            ? `\n\nRespond ONLY with valid JSON matching exactly this schema: ${JSON.stringify(cfg.responseSchema)}`
            : "";
        return `${input}${schema}`;
    }

    private async parseJson(text: string): Promise<unknown | undefined> {
        try {
            return JSON.parse(text);
        } catch {
            return undefined;
        }
    }

    private async gemini(cfg: AINodeConfig, input: string, key: string): Promise<LLMResult> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${key}`;
        const system = cfg.systemPrompt || "You are a helpful AI assistant.";
        const doc = this.wantsJson(cfg)
            ? { responseMimeType: "application/json" }
            : {};
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${system}\n\n${this.buildUserPrompt(cfg, input)}` }] }],
                generationConfig: { temperature: cfg.temperature ?? 0.7, maxOutputTokens: cfg.maxTokens ?? 2048, ...doc },
            }),
        });
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const u = data?.usageMetadata;
        const inT = u?.promptTokenCount ?? 0;
        const outT = u?.candidatesTokenCount ?? 0;
        return { text, json: this.wantsJson(cfg) ? await this.parseJson(text) : undefined, tokensUsed: inT + outT, costUsd: 0 };
    }

    private async openai(cfg: AINodeConfig, input: string, key: string): Promise<LLMResult> {
        const base = this.config.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
        const messages: Array<{ role: "system" | "user"; content: string }> = [];
        if (cfg.systemPrompt) messages.push({ role: "system", content: cfg.systemPrompt });
        messages.push({ role: "user", content: this.buildUserPrompt(cfg, input) });
        const res = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({
                model: cfg.model ?? "gpt-4o-mini",
                temperature: cfg.temperature ?? 0.7,
                max_tokens: cfg.maxTokens ?? 2048,
                messages,
                ...(this.wantsJson(cfg) ? { response_format: { type: "json_object" } } : {}),
            }),
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? "";
        const u = data?.usage;
        const inT = u?.prompt_tokens ?? 0;
        const outT = u?.completion_tokens ?? 0;
        return { text, json: this.wantsJson(cfg) ? await this.parseJson(text) : undefined, tokensUsed: inT + outT, costUsd: (inT / 1000) * 0.00015 + (outT / 1000) * 0.0006 };
    }

    private async anthropic(cfg: AINodeConfig, input: string, key: string): Promise<LLMResult> {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: cfg.model ?? "claude-3-5-haiku-latest",
                max_tokens: cfg.maxTokens ?? 2048,
                temperature: cfg.temperature ?? 0.7,
                system: cfg.systemPrompt,
                messages: [{ role: "user", content: this.buildUserPrompt(cfg, input) }],
            }),
        });
        if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const text: string = data?.content?.[0]?.text ?? "";
        const inT = data?.usage?.input_tokens ?? 0;
        const outT = data?.usage?.output_tokens ?? 0;
        return { text, json: this.wantsJson(cfg) ? await this.parseJson(text) : undefined, tokensUsed: inT + outT, costUsd: 0 };
    }
}
