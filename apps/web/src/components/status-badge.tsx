"use client";

/**
 * Execution status pill with color coding.
 * Shared across dashboard / executions / approvals pages.
 */
export function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        queued: "bg-yellow-500/10 text-yellow-400",
        running: "bg-blue-500/10 text-blue-400",
        waiting_approval: "bg-orange-500/10 text-orange-400",
        succeeded: "bg-green-500/10 text-green-400",
        failed: "bg-red-500/10 text-red-400",
        cancelled: "bg-gray-500/10 text-gray-400",
        timed_out: "bg-gray-500/10 text-gray-400",
        pending: "bg-yellow-500/10 text-yellow-400",
        approved: "bg-green-500/10 text-green-400",
        rejected: "bg-red-500/10 text-red-400",
    };
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-500/10 text-gray-400"
                }`}
        >
            {status.replace("_", " ")}
        </span>
    );
}