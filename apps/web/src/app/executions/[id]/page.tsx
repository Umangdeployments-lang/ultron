"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api, ExecutionDTO } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";

interface StepTrace {
    nodeId: string;
    nodeLabel?: string;
    nodeType?: string;
    status: string;
    input?: unknown;
    output?: unknown;
    error?: string;
    durationMs?: number;
}

export default function ExecutionDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [exec, setExec] = useState<ExecutionDTO | null>(null);
    const [steps, setSteps] = useState<StepTrace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([api.getExecution(params.id), api.getExecutionSteps(params.id)])
            .then(([execData, stepData]) => {
                setExec(execData);
                setSteps(stepData as StepTrace[]);
            })
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !exec) {
        return (
            <div className="p-8">
                <div className="text-red-400">{error ?? "Execution not found"}</div>
                <button
                    onClick={() => router.push("/executions")}
                    className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm"
                >
                    ← Back to executions
                </button>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => router.push("/executions")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold tracking-tight">
                            Execution {exec.id.slice(0, 8)}
                        </h1>
                        <StatusBadge status={exec.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {exec.workflow?.name ?? exec.workflowId} · v{exec.version} ·{" "}
                        {new Date(exec.startedAt ?? exec.createdAt).toLocaleString()}
                    </div>
                </div>
            </div>

            {exec.error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {exec.error}
                </div>
            )}

            <div className="glass-card p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Full Trace
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs">
                    {JSON.stringify({ input: exec.input, output: exec.output, steps }, null, 2)}
                </pre>
            </div>
        </div>
    );
}
