"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Copy, Trash2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { WorkflowDTO } from "@/lib/api";

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        api.listWorkflows()
            .then(setWorkflows)
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const createWorkflow = async () => {
        try {
            const wf = await api.createWorkflow({
                name: `New Workflow ${workflows.length + 1}`,
                description: "Untitled workflow",
            });
            window.location.href = `/workflows/${wf.id}`;
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    const deleteWorkflow = async (id: string) => {
        if (!confirm("Delete this workflow?")) return;
        try {
            await api.deleteWorkflow(id);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    const copyHook = async (id: string) => {
        try {
            const hook = await api.getWorkflowHook(id);
            if (!hook.hookPath) {
                alert("No webhook URL yet — publish the workflow first.");
                return;
            }
            await navigator.clipboard.writeText(
                `${window.location.origin}/api/hooks/${hook.hookPath}`
            );
            alert("Webhook URL copied!");
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
                    <p className="text-sm text-muted-foreground">
                        Build AI-powered automations on the visual canvas.
                    </p>
                </div>
                <button
                    onClick={createWorkflow}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" /> New Workflow
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : workflows.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
                    <Zap className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <div className="text-sm font-medium">No workflows yet</div>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Create your first workflow to automate a business process with
                        Webhook → AI → Action nodes.
                    </p>
                    <button
                        onClick={createWorkflow}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" /> Create Workflow
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workflows.map((wf) => (
                        <div key={wf.id} className="glass-card glass-hover p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium">{wf.name}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {wf.description || "Untitled"}
                                    </div>
                                </div>
                                <StatusBadge status={wf.status} />
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>v{wf.version}</span>
                                <span>·</span>
                                <span>{new Date(wf.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <Link
                                    href={`/workflows/${wf.id}`}
                                    className="inline-flex items-center gap-1 rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
                                >
                                    <Pencil className="h-3 w-3" /> Edit
                                </Link>
                                <button
                                    onClick={() => copyHook(wf.id)}
                                    className="inline-flex items-center gap-1 rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
                                >
                                    <Copy className="h-3 w-3" /> Hook
                                </button>
                                <button
                                    onClick={() => deleteWorkflow(wf.id)}
                                    className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        draft: "bg-gray-500/10 text-gray-400",
        active: "bg-green-500/10 text-green-400",
        paused: "bg-yellow-500/10 text-yellow-400",
        archived: "bg-gray-500/10 text-gray-400",
    };
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
            {status}
        </span>
    );
}
