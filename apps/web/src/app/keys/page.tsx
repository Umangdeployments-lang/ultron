"use client";

import { useState, useEffect } from "react";
import { KeyRound, Plus, Trash2, Loader2 } from "lucide-react";
import { api, ApiKeyDTO } from "@/lib/api";

const PROVIDERS = [
    { value: "gemini", label: "Gemini" },
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
    { value: "custom", label: "Custom / Self-hosted" },
] as const;

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["value"]>("gemini");
    const [keyValue, setKeyValue] = useState("");
    const [creating, setCreating] = useState(false);

    const refresh = async () => {
        try {
            setError(null);
            setKeys(await api.listApiKeys());
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !keyValue.trim()) return;
        setCreating(true);
        setError(null);
        try {
            await api.createApiKey({ name, provider, keyValue });
            setShowCreate(false);
            setName("");
            setKeyValue("");
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setCreating(false);
        }
    };

    const remove = async (id: string) => {
        try {
            await api.deleteApiKey(id);
            setKeys((ks) => ks.filter((k) => k.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        Bring Your Own Keys (BYOK) for AI nodes. Keys are encrypted at
                        rest and tenant-scoped.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                    <Plus className="h-3.5 w-3.5" /> Add Key
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {showCreate && (
                <form
                    onSubmit={create}
                    className="glass-card mb-6 space-y-3 p-5"
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Name
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Prod Gemini Key"
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Provider
                            </label>
                            <select
                                value={provider}
                                onChange={(e) =>
                                    setProvider(e.target.value as typeof provider)
                                }
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                            >
                                {PROVIDERS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={keyValue}
                                onChange={(e) => setKeyValue(e.target.value)}
                                placeholder="sk-…"
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowCreate(false)}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                            {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                            Save Key
                        </button>
                    </div>
                </form>
            )}

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-5 text-sm text-muted-foreground">Loading…</div>
                ) : keys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
                        <div className="text-sm font-medium">No API keys yet</div>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            Add a key to use BYOK mode in AI nodes, or use the
                            platform-managed key.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {keys.map((key) => {
                            const providerMeta = PROVIDERS.find(
                                (p) => p.value === key.provider
                            );
                            return (
                                <div
                                    key={key.id}
                                    className="flex items-center gap-3 px-5 py-3"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm">
                                        <KeyRound className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{key.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {providerMeta?.label ?? key.provider}
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </div>
                                    <button
                                        onClick={() => remove(key.id)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
