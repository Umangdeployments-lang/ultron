"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Workflow,
    Activity,
    ShieldCheck,
    Plus,
    ArrowRight,
    Layers,
    Sparkles,
    CircleDashed,
    CheckCircle2,
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
    const failed = executions.filter((e) => ["failed", "timed_out"].includes(e.status)).length;

    const stats = [
        {
            label: "Total Workflows",
            value: workflows.length,
            icon: Workflow,
            accent: "text-primary bg-primary/10 border-primary/20",
        },
        {
            label: "Running Now",
            value: running,
            icon: Activity,
            accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        },
        {
            label: "Successful Runs",
            value: succeeded,
            icon: CheckCircle2,
            accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
        {
            label: "Failed Runs",
            value: failed,
            icon: CircleDashed,
            accent: "text-red-400 bg-red-500/10 border-red-500/20",
        },
    ];

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI-Native Operating System
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Monitor your automations at a glance
                    </p>
                </div>
                <Link href="/workflows/new" className="btn-primary">
                    <Plus className="h-4 w-4" /> New Workflow
                </Link>
            </div>

            {/* Stat cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="card card-hover p-5">
                        <div
                            className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border ${stat.accent}`}
                        >
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="font-display text-3xl font-bold leading-none">
                            {loading ? (
                                <span className="inline-block h-8 w-10 animate-pulse rounded bg-white/10" />
                            ) : (
                                stat.value
                            )}
                        </div>
                        <div className="mt-2 text-xs font-medium text-muted-foreground">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Link
                    href="/workflows"
                    className="card card-hover group flex items-center gap-3 p-4"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">Explore Workflows</div>
                        <div className="truncate text-xs text-muted-foreground">
                            View and manage your automations
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
                <Link
                    href="/executions"
                    className="card card-hover group flex items-center gap-3 p-4"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">Execution History</div>
                        <div className="truncate text-xs text-muted-foreground">
                            Audit logs of every automation run
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </Link>
                <Link
                    href="/approvals"
                    className="card card-hover group flex items-center gap-3 p-4"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">Pending Approvals</div>
                        <div className="truncate text-xs text-muted-foreground">
                            Review workflow approval requests
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400" />
                </Link>
            </div>

            {/* Recent executions */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold">Recent Executions</h2>
                    </div>
                    <Link href="/executions" className="btn-ghost !px-2 !py-1 text-xs">
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5">
                        {[...Array(3)].map((_, i) => (
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
                            Create a workflow and trigger it to see execution logs here.
                        </p>
                        <Link href="/workflows/new" className="btn-primary mt-4">
                            <Plus className="h-4 w-4" /> Create a Workflow
                        </Link>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Workflow</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th className="text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {executions.slice(0, 8).map((exec) => (
                                    <tr key={exec.id}>
                                        <td className="font-medium">
                                            {exec.workflow?.name ?? exec.workflowId}
                                        </td>
                                        <td>
                                            <StatusBadge status={exec.status} />
                                        </td>
                                        <td className="text-muted-foreground">
                                            {new Date(exec.createdAt).toLocaleString()}
                                        </td>
                                        <td className="text-right">
                                            <Link
                                                href={`/executions/${exec.id}`}
                                                className="btn-ghost !px-2.5 !py-1 text-xs"
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