"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Workflow,
    Activity,
    ShieldCheck,
    Plus,
    ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { WorkflowDTO, ExecutionDTO } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";

export default function DashboardPage() {
    const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
    const [executions, setExecutions] = useState<ExecutionDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.listWorkflows(), api.listExecutions()])
            .then(([w, e]) => {
                setWorkflows(w);
                setExecutions(e);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const running = executions.filter((e) =>
        ["queued", "running", "waiting_approval"].includes(e.status)
    ).length;
    const succeeded = executions.filter((e) => e.status === "succeeded").length;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    AI-Native Operating System for Business
                </p>
            </div>

            {/* Stat cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Workflow className="h-4 w-4" /> Workflows
                    </div>
                    <div className="mt-2 text-3xl font-semibold">{workflows.length}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Activity className="h-4 w-4" /> Active Runs
                    </div>
                    <div className="mt-2 text-3xl font-semibold">{running}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" /> Successful Runs
                    </div>
                    <div className="mt-2 text-3xl font-semibold">{succeeded}</div>
                </div>
            </div>

            {/* Quick actions */}
            <div className="mb-8 flex flex-wrap gap-3">
                <Link
                    href="/workflows/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" /> New Workflow
                </Link>
            </div>

            {/* Recent executions */}
            <div className="glass-card overflow-hidden">
                <div className="border-b border-white/10 px-5 py-3 text-sm font-medium">
                    Recent Executions
                </div>
                {loading ? (
                    <div className="p-5 text-sm text-muted-foreground">Loading…</div>
                ) : executions.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground">
                        No executions yet. Create a workflow to get started.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-xs text-muted-foreground">
                                    <th className="px-5 py-3 font-medium">Workflow</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Created</th>
                                    <th className="px-5 py-3 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {executions.slice(0, 10).map((exec) => (
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
                                            {new Date(exec.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/executions/${exec.id}`}
                                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                            >
                                                View <ArrowRight className="h-3 w-3" />
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

