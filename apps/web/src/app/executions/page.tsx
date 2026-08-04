"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { api, ExecutionDTO } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";

export default function ExecutionsPage() {
    const [executions, setExecutions] = useState<ExecutionDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.listExecutions()
            .then(setExecutions)
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Executions</h1>
                <p className="text-sm text-muted-foreground">
                    Every workflow run with full step-by-step AI trace.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-5 text-sm text-muted-foreground">Loading…</div>
                ) : executions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Activity className="mb-3 h-10 w-10 text-muted-foreground/50" />
                        <div className="text-sm font-medium">No executions yet</div>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            Trigger a workflow from the editor or via webhook to see runs here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-xs text-muted-foreground">
                                    <th className="px-5 py-3 font-medium">Workflow</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Version</th>
                                    <th className="px-5 py-3 font-medium">Started</th>
                                    <th className="px-5 py-3 font-medium">Finished</th>
                                    <th className="px-5 py-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody>
                                {executions.map((exec) => (
                                    <tr
                                        key={exec.id}
                                        className="border-b border-white/5 transition hover:bg-white/5"
                                    >
                                        <td className="px-5 py-3">
                                            {exec.workflow?.name ?? exec.workflowId}
                                        </td>
                                        <td className="px-5 py-3">
                                            <StatusBadge status={exec.status} />
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            v{exec.version}
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {new Date(exec.startedAt ?? exec.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {exec.finishedAt
                                                ? new Date(exec.finishedAt).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link
                                                href={`/executions/${exec.id}`}
                                                className="inline-flex items-center gap-1 text-primary hover:underline"
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
