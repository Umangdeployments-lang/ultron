"use client";

import { useMemo } from "react";
import { NODE_REGISTRY, type NodeDefinition } from "@ultron/shared";
import { cn } from "@/lib/utils";

interface NodePaletteProps {
    className?: string;
}

/**
 * Sidebar palette of draggable node types.
 * Each item sets `application/ultron-node` drag data which the
 * canvas drop handler consumes to create a new node.
 */
export function NodePalette({ className }: NodePaletteProps) {
    // Group registry entries by category preserving order
    const groups = useMemo(() => {
        const map = new Map<string, NodeDefinition[]>();
        for (const def of NODE_REGISTRY) {
            const list = map.get(def.category) ?? [];
            list.push(def);
            map.set(def.category, list);
        }
        return Array.from(map.entries());
    }, []);

    const onDragStart = (event: React.DragEvent, def: NodeDefinition) => {
        event.dataTransfer.setData(
            "application/ultron-node",
            JSON.stringify({
                type: def.type,
                kind: def.kind,
                defaults: def.defaults,
            })
        );
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            className={cn(
                "flex w-60 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0a0f1e]/80 backdrop-blur-xl",
                className
            )}
        >
            <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">Nodes</h2>
                <p className="text-[11px] text-slate-400">
                    Drag a node onto the canvas
                </p>
            </div>

            {groups.map(([category, defs]) => (
                <div key={category} className="px-3 py-3">
                    <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        {category}
                    </div>
                    <div className="space-y-1.5">
                        {defs.map((def) => (
                            <button
                                key={`${def.type}-${def.kind}`}
                                draggable
                                onDragStart={(e) => onDragStart(e, def)}
                                className={cn(
                                    "group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all",
                                    "hover:border-white/10 hover:bg-white/5 active:scale-[0.98]"
                                )}
                                title={def.description}
                            >
                                <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm"
                                    style={{ background: `${def.color}22`, color: def.color }}
                                >
                                    {def.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-medium text-slate-200 group-hover:text-white">
                                        {def.label}
                                    </div>
                                    <div className="truncate text-[10px] text-slate-500">
                                        {def.description.length > 38
                                            ? `${def.description.slice(0, 38)}…`
                                            : def.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
