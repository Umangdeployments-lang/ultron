"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity, Search, AlertCircle } from "lucide-react";
import { api, ExecutionDTO } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";

export default function ExecutionsPage() {
    const [executions, setExecutions] = useState<ExecutionDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        api.listExecutions()
            .then(setExecutions)
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setLoading(false));
    }, []);

    const filtered = executions.filter(
        (e) =>
            (e.workflow?.name ?? e.workflowId)
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            e.status.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                        <Activity className="h-3.5 w-3.5" />
                        Audit Trail
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight">
                        Executions
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Every workflow run with full step-by-step AI trace
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {!loading && executions.length > 0 && (
                <div className="relative mb-6 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search executions…"
                        className="input !pl-9"
                    />
                </div>
            )}

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="space-y-3 p-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-1/4 animate-pulse rounded bg-white/5" />
                                </div>
                                <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                            </div>
                        ))}
                    </div>
                ) : executions.length === 0 ? (
                    <div className="empty-state">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                            <Activity className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <div className="text-sm font-medium">No executions yet</div>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            Trigger a workflow from the editor or via webhook to see runs here.
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="text-sm font-medium">No matches found</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Try a different search term.
                        </p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Workflow</th>
                                    <th>Status</th>
                                    <th>Version</th>
                                    <th>Started</th>
                                    <th>Finished</th>
                                    <th className="text-right">Trace</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((exec) => (
                                    <tr key={exec.id}>
                                        <td className="font-medium">
                                            {exec.workflow?.name ?? exec.workflowId}
                                        </td>
                                        <td>
                                            <StatusBadge status={exec.status} />
                                        </td>
                                        <td className="text-muted-foreground">
                                            v{exec.version}
                                        </td>
                                        <td className="text-muted-foreground">
                                            {new Date(exec.startedAt ?? exec.createdAt).toLocaleString()}
                                        </td>
                                        <td className="text-muted-foreground">
                                            {exec.finishedAt
                                                ? new Date(exec.finishedAt).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="text-right">
                                            <Link
                                                href={`/executions/${exec.id}`}
                                                className="btn-ghost !px-2.5 !py-1 text-xs"
                                            >
                                                Trace <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}