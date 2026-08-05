"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Plus,
    Pencil,
    Copy,
    Trash2,
    Zap,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { WorkflowDTO } from "@/lib/api";

const WORKFLOW_STATUS_MAP: Record<string, string> = {
    draft: "status-neutral",
    active: "status-success",
    paused: "status-warning",
    archived: "status-neutral",
};

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const filtered = workflows.filter(
        (wf) =>
            wf.name.toLowerCase().includes(search.toLowerCase()) ||
            (wf.description ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const countByStatus = (status: string) =>
        workflows.filter((w) => w.status === status).length;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Layers className="h-3.5 w-3.5" />
                        Automation Library
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight">
                        Workflows
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Build AI-powered automations on the visual canvas
                    </p>
                </div>
                <button onClick={createWorkflow} className="btn-primary">
                    <Plus className="h-4 w-4" /> New Workflow
                </button>
            </div>

            {/* Status summary chips */}
            {!loading && workflows.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <span className="badge status-neutral">
                        <Layers className="h-3 w-3" /> {workflows.length} total
                    </span>
                    <span className="badge status-success">
                        <CheckCircle2 className="h-3 w-3" /> {countByStatus("active")} active
                    </span>
                    <span className="badge status-warning">
                        <Clock className="h-3 w-3" /> {countByStatus("paused")} paused
                    </span>
                    <span className="badge status-neutral">
                        <Clock className="h-3 w-3" /> {countByStatus("draft")} draft
                    </span>
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="card overflow-hidden">
                            <div className="space-y-3 p-5">
                                <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                                <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                            </div>
                            <div className="flex gap-2 border-t border-white/5 p-4">
                                <div className="h-8 w-16 animate-pulse rounded-md bg-white/10" />
                                <div className="h-8 w-16 animate-pulse rounded-md bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : workflows.length === 0 ? (
                <div className="empty-state">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20">
                        <Zap className="h-7 w-7 text-primary" />
                    </div>
                    <div className="font-display text-lg font-semibold">
                        No workflows yet
                    </div>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        Create your first workflow to automate a business process with
                        Webhook → AI → Action nodes.
                    </p>
                    <button onClick={createWorkflow} className="btn-primary mt-5">
                        <Plus className="h-4 w-4" /> Create Workflow
                    </button>
                </div>
            ) : (
                <>
                    {/* Search */}
                    <div className="relative mb-6 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search workflows…"
                            className="input !pl-9"
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="text-sm font-medium">No matches found</div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Try a different search term.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((wf) => (
                                <div key={wf.id} className="card card-hover overflow-hidden">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate font-semibold">
                                                    {wf.name}
                                                </div>
                                                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                    {wf.description || "Untitled"}
                                                </div>
                                            </div>
                                            <span
                                                className={`badge shrink-0 ${WORKFLOW_STATUS_MAP[wf.status] ?? "status-neutral"}`}
                                            >
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                {wf.status}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <span className="badge status-neutral !px-1.5 !py-0.5 text-[10px]">
                                                v{wf.version}
                                            </span>
                                            <span>·</span>
                                            <span>
                                                Updated {new Date(wf.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 border-t border-white/5 bg-white/[0.02] px-4 py-3">
                                        <Link
                                            href={`/workflows/${wf.id}`}
                                            className="btn-secondary !px-3 !py-1.5 text-xs"
                                        >
                                            <Pencil className="h-3 w-3" /> Edit
                                        </Link>
                                        <button
                                            onClick={() => copyHook(wf.id)}
                                            className="btn-ghost !px-3 !py-1.5 text-xs"
                                        >
                                            {copiedId === wf.id ? (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-emerald-400">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3" /> Hook
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteWorkflow(wf.id)}
                                            className="btn-danger ml-auto !px-3 !py-1.5 text-xs"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}