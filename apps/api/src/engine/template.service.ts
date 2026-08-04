import { Injectable } from "@nestjs/common";

/**
 * Template engine for {{nodeId.field}} syntax.
 * Resolves references to previous node outputs.
 *
 * Examples:
 *   "Hello {{trigger.name}}"            → "Hello John"
 *   "{{ai.result.message}}"             → "Thanks for your order!"
 *   "{{trigger}}"                       → the whole payload object (JSON-stringified when embedded in text)
 */
@Injectable()
export class TemplateService {
    /**
     * Replace all {{nodeId.field.path}} tokens in a string.
     */
    resolveString(
        template: string,
        nodeOutputs: Record<string, unknown>
    ): string {
        if (!template) return template;

        return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, token: string) => {
            const segments = token.split(".");
            const nodeId = segments[0];

            if (!(nodeId in nodeOutputs)) {
                return match; // keep unresolved tokens as-is
            }

            let value: unknown = nodeOutputs[nodeId];

            for (let i = 1; i < segments.length; i++) {
                if (value === null || value === undefined) {
                    return "";
                }
                if (typeof value === "object") {
                    value = (value as Record<string, unknown>)[segments[i]];
                } else {
                    return "";
                }
            }

            return this.stringifyValue(value);
        });
    }

    /**
     * Resolve a full object recursively, applying templates to all strings.
     */
    resolveObject(
        obj: unknown,
        nodeOutputs: Record<string, unknown>
    ): unknown {
        if (typeof obj === "string") {
            // Check for exact single template match
            const exactMatch = obj.match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
            if (exactMatch) {
                const token = exactMatch[1];
                const segments = token.split(".");
                const nodeId = segments[0];

                if (nodeId in nodeOutputs) {
                    let value: unknown = nodeOutputs[nodeId];
                    let found = true;
                    for (let i = 1; i < segments.length; i++) {
                        if (value === null || value === undefined) {
                            found = false;
                            break;
                        }
                        if (typeof value === "object") {
                            value = (value as Record<string, unknown>)[segments[i]];
                        } else {
                            found = false;
                            break;
                        }
                    }
                    if (found) {
                        return value; // Return raw object, don't stringify
                    }
                }
            }
            return this.resolveString(obj, nodeOutputs);
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.resolveObject(item, nodeOutputs));
        }
        if (obj !== null && typeof obj === "object") {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.resolveObject(value, nodeOutputs);
            }
            return result;
        }
        return obj;
    }

    private stringifyValue(value: unknown): string {
        if (value === null || value === undefined) return "";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        // Objects/arrays → JSON for embedding in text
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
}
