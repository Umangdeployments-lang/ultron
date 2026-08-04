"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { WorkflowNode } from "@ultron/shared";
import { NODE_REGISTRY } from "@ultron/shared";

export type CanvasNodeData = {
    workflowNode?: WorkflowNode;
    label: string;
    [key: string]: unknown;
};

export type CanvasNode = Node<CanvasNodeData, "ultron">;

const COLORS: Record<string, string> = {
    trigger: "#8b5cf6",
    ai: "#f59e0b",
    condition: "#f59e0b",
    approval: "#ef4444",
    action: "#10b981",
    delay: "#f59e0b",
    code: "#f59e0b",
};

function UltronNode({ data, selected }: NodeProps<CanvasNode>) {
    const wfNode = data.workflowNode;
    const def = wfNode
        ? NODE_REGISTRY.find(
            (d) => d.type === wfNode.type && d.kind === wfNode.data.kind
        )
        : undefined;

    const type = wfNode?.type ?? "trigger";
    const color = def?.color ?? COLORS[type] ?? "#64748b";
    const icon = def?.icon ?? "⚙️";
    const hasInput = def?.hasInput ?? wfNode?.type !== "trigger";
    const hasOutput = def?.hasOutput ?? true;
    const label = data.label ?? def?.label ?? "Node";

    return (
        <div
            className="min-w-[200px] rounded-xl border bg-[#0f172a]/90 backdrop-blur-xl shadow-lg shadow-black/30 transition-all"
            style={{ borderColor: selected ? color : "rgba(255,255,255,0.1)" }}
        >
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!h-2.5 !w-2.5 !border-2 !border-[#0f172a]"
                    style={{ background: color }}
                />
            )}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                    style={{ background: `${color}22`, color }}
                >
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {def?.type ?? type}
                    </div>
                </div>
            </div>
            {hasOutput && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!h-2.5 !w-2.5 !border-2 !border-[#0f172a]"
                    style={{ background: color }}
                />
            )}
        </div>
    );
}

export default memo(UltronNode);