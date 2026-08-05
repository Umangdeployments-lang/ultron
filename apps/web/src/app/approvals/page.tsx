"use client";

import { useEffect, useState } from "react";
import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    AlertCircle,
} from "lucide-react";
import { api, ApprovalDTO } from "@/lib/api";

export default function ApprovalsPage() {
    const [approvals, setApprovals] = useState<ApprovalDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.listPendingApprovals()
            .then(setApprovals)
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Human-in-the-Loop
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight">
                        Approvals
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review workflow gates waiting for your decision
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="card p-5">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 animate-pulse rounded-lg bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
                                <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : approvals.length === 0 ? (
                <div className="empty-state">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                        <ShieldCheck className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div className="font-display text-lg font-semibold">
                        All caught up
                    </div>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        When a workflow hits an Approval Gate node, it appears here
                        for approve/reject.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {approvals.map((approval) => (
                        <div key={approval.id} className="card card-hover p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
                                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium">
                                            {approval.execution?.workflow?.name ??
                                                approval.execution?.workflowId}
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {approval.message}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="badge status-neutral !px-1.5 !py-0.5 text-[10px]">
                                                {approval.executionId.slice(0, 8)}
                                            </span>
                                            <span>·</span>
                                            <span>
                                                {new Date(approval.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <PendingBadge status={approval.status} />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() =>
                                        window.open(
                                            `/approvals/${approval.token}/approve`,
                                            "_blank"
                                        )
                                    }
                                    className="btn-secondary !border-green-500/30 !bg-green-500/10 !py-1.5 !text-green-400 hover:!bg-green-500/20 text-xs"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve{" "}
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                </button>
                                <button
                                    onClick={() =>
                                        window.open(
                                            `/approvals/${approval.token}/reject`,
                                            "_blank"
                                        )
                                    }
                                    className="btn-secondary !border-red-500/30 !bg-red-500/10 !py-1.5 !text-red-400 hover:!bg-red-500/20 text-xs"
                                >
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PendingBadge({ status }: { status: string }) {
    if (status === "pending") {
        return (
            <span className="badge status-warning">
                <Clock className="h-3 w-3" /> Pending
            </span>
        );
    }
    return (
        <span className="badge status-success">
            <CheckCircle2 className="h-3 w-3" /> {status}
        </span>
    );
}