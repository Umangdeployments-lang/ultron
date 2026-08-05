"use client";

import {
    CheckCircle2,
    Clock,
    Loader2,
    XCircle,
    AlertTriangle,
    CircleSlash,
    ShieldCheck,
    Ban,
} from "lucide-react";

/**
 * Execution status pill with color coding and icon.
 * Shared across dashboard / executions / approvals pages.
 */
export function StatusBadge({ status }: { status: string }) {
    const config: Record<
        string,
        { className: string; icon: React.ReactNode }
    > = {
        queued: {
            className: "status-warning",
            icon: <Clock className="h-3 w-3" />,
        },
        pending: {
            className: "status-warning",
            icon: <Clock className="h-3 w-3" />,
        },
        running: {
            className: "status-running",
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
        },
        waiting_approval: {
            className: "status-warning",
            icon: <ShieldCheck className="h-3 w-3" />,
        },
        succeeded: {
            className: "status-success",
            icon: <CheckCircle2 className="h-3 w-3" />,
        },
        approved: {
            className: "status-success",
            icon: <CheckCircle2 className="h-3 w-3" />,
        },
        failed: {
            className: "status-danger",
            icon: <XCircle className="h-3 w-3" />,
        },
        rejected: {
            className: "status-danger",
            icon: <Ban className="h-3 w-3" />,
        },
        cancelled: {
            className: "status-neutral",
            icon: <CircleSlash className="h-3 w-3" />,
        },
        timed_out: {
            className: "status-danger",
            icon: <AlertTriangle className="h-3 w-3" />,
        },
    };

    const c = config[status] ?? {
        className: "status-neutral",
        icon: <AlertTriangle className="h-3 w-3" />,
    };

    return (
        <span className={`badge ${c.className}`}>
            {c.icon}
            {status.replace("_", " ")}
        </span>
    );
}