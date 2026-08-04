"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
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
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
                <p className="text-sm text-muted-foreground">
                    Human-in-the-loop gates waiting for your decision.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : approvals.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
                    <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <div className="text-sm font-medium">No pending approvals</div>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        When a workflow hits an Approval Gate node, it appears here
                        for approve/reject.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {approvals.map((approval) => (
                        <div key={approval.id} className="glass-card glass-hover p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 font-medium">
                                        <ShieldCheck className="h-4 w-4 text-orange-400" />
                                        {approval.execution?.workflow?.name ??
                                            approval.execution?.workflowId}
                                    </div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {approval.message}
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>Execution {approval.executionId.slice(0, 8)}</span>
                                        <span>·</span>
                                        <span>
                                            {new Date(approval.createdAt).toLocaleString()}
                                        </span>
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
                                    className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/30"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button
                                    onClick={() =>
                                        window.open(
                                            `/approvals/${approval.token}/reject`,
                                            "_blank"
                                        )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30"
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
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
                <Clock className="h-3 w-3" /> Pending
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
            {status}
        </span>
    );
}
