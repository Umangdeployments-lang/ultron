"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    addEdge,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Save, Play, Globe, ArrowLeft, Trash2 } from "lucide-react";
import { NODE_REGISTRY } from "@ultron/shared";
import type {
    NodeType,
    WorkflowNode as SharedWorkflowNode,
    WorkflowDefinition,
} from "@ultron/shared";
import { api, WorkflowDTO } from "@/lib/api";
import UltronNode, { CanvasNode, CanvasNodeData } from "@/components/canvas/ultron-node";
import { NodePalette } from "@/components/canvas/node-palette";

const nodeTypes: NodeTypes = { ultron: UltronNode };

function workflowNodeToCanvas(node: SharedWorkflowNode): CanvasNode {
    const def = NODE_REGISTRY.find((d) => d.type === node.type && d.kind === node.data.kind);
    const pos = node.position ?? {};
    return {
        id: node.id,
        type: "ultron",
        position: { x: pos.x ?? 100, y: pos.y ?? 100 },
        data: {
            label: node.data.label ?? def?.label ?? node.type,
            workflowNode: node,
        },
    };
}

function canvasToWorkflowNode(node: CanvasNode): SharedWorkflowNode {
    const wf = node.data.workflowNode;
    return {
        id: node.id,
        type: wf?.type ?? "trigger",
        position: node.position,
        data: {
            label: node.data.label ?? wf?.data.label ?? "Node",
            type: (wf?.type ?? "trigger") as NodeType,
            kind:
                wf?.data.kind ??
                (wf?.type === "trigger"
                    ? "webhook"
                    : wf?.type === "action"
                        ? "email"
                        : wf?.type ?? "trigger"),
            config: wf?.data.config ?? {},
        },
    };
}

function definitionToFlow(def: WorkflowDefinition | undefined): {
    nodes: CanvasNode[];
    edges: Edge[];
} {
    const nodes = (def?.nodes ?? []).map((n) => workflowNodeToCanvas(n));
    const edges = (def?.edges ?? []).map((e, i) => ({
        id: e.id ?? `e-${i}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
    }));
    return { nodes, edges };
}

function flowToDefinition(nodes: CanvasNode[], edges: Edge[]): WorkflowDefinition {
    return {
        version: 1,
        nodes: nodes.map((n) => canvasToWorkflowNode(n)),
        edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? undefined,
            targetHandle: e.targetHandle ?? undefined,
        })),
    };
}

export default function WorkflowEditorPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.listWorkflows()
            .then((list) => list.find((w) => w.id === params.id))
            .then((wf) => {
                if (!wf) {
                    setError("Workflow not found");
                    return;
                }
                setWorkflow(wf);
                const { nodes: n, edges: e } = definitionToFlow(
                    wf.definition as WorkflowDefinition
                );
                setNodes(n);
                setEdges(e);
            })
            .catch((err) => setError(err.message));
    }, [params.id, setNodes, setEdges]);

    const onConnect = useCallback(
        (connection: Connection) =>
            setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const raw = event.dataTransfer.getData("application/ultron-node");
            if (!raw) return;
            const { type, kind } = JSON.parse(raw) as { type: string; kind: string };
            const def = NODE_REGISTRY.find((d) => d.type === type && d.kind === kind);
            if (!def) return;

            const position = { x: event.clientX - 80, y: event.clientY - 40 };
            const id = crypto.randomUUID();
            const wfNode: SharedWorkflowNode = {
                id,
                type: type as SharedWorkflowNode["type"],
                position,
                data: {
                    label: def.label,
                    type: type as NodeType,
                    kind,
                    config: { ...def.defaults },
                },
            };
            setNodes((nds) => [...nds, workflowNodeToCanvas(wfNode) as CanvasNode]);
        },
        [setNodes]
    );

    const save = async () => {
        if (!workflow) return;
        setSaving(true);
        setError(null);
        try {
            const definition = flowToDefinition(nodes, edges);
            const updated = await api.updateWorkflow(workflow.id, { definition });
            setWorkflow(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    const publish = async () => {
        if (!workflow) return;
        setError(null);
        try {
            const definition = flowToDefinition(nodes, edges);
            await api.updateWorkflow(workflow.id, { definition });
            const updated = await api.publishWorkflow(workflow.id);
            setWorkflow(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    const runTest = async () => {
        if (!workflow) return;
        try {
            const res = await api.triggerWorkflow(workflow.id, { test: true });
            alert(`Execution started: ${res.executionId}`);
            router.push(`/executions/${res.executionId}`);
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const updateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id !== nodeId) return n;
                const wf = n.data.workflowNode;
                const updated: SharedWorkflowNode = {
                    id: n.id,
                    type: wf?.type ?? "trigger",
                    position: n.position,
                    data: {
                        label: wf?.data.label ?? "Node",
                        type: (wf?.type ?? "trigger") as NodeType,
                        kind: wf?.data.kind ?? "webhook",
                        config,
                    },
                };
                return { ...n, data: { ...n.data, workflowNode: updated } };
            })
        );
    };

    const deleteSelected = useCallback(() => {
        if (!selectedNodeId) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) =>
            eds.filter(
                (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
            )
        );
        setSelectedNodeId(null);
    }, [selectedNodeId, setNodes, setEdges]);

    const selectedNode = useMemo(
        () => nodes.find((n) => n.id === selectedNodeId),
        [nodes, selectedNodeId]
    );

    if (error && !workflow) {
        return (
            <div className="flex h-screen items-center justify-center p-8">
                <div className="text-center">
                    <div className="text-red-400">{error}</div>
                    <button
                        onClick={() => router.push("/workflows")}
                        className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm"
                    >
                        ← Back to workflows
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full">
            <NodePalette />

            <div className="relative flex-1">
                {/* Top bar */}
                <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2.5 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/workflows")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                            <input
                                value={workflow?.name ?? ""}
                                onChange={(e) =>
                                    setWorkflow((wf) =>
                                        wf ? { ...wf, name: e.target.value } : wf
                                    )
                                }
                                className="bg-transparent text-sm font-semibold outline-none"
                            />
                            <div className="text-[10px] text-muted-foreground">
                                v{workflow?.version ?? 1} · {workflow?.status ?? "draft"}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {workflow?.hookPath && (
                            <div className="hidden items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted-foreground md:flex">
                                <Globe className="h-3.5 w-3.5" />
                                <span className="font-mono">/hooks/{workflow.hookPath}</span>
                            </div>
                        )}
                        <button
                            onClick={save}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15 disabled:opacity-50"
                        >
                            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                            onClick={runTest}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-400 transition hover:bg-yellow-500/30"
                        >
                            <Play className="h-3.5 w-3.5" /> Test
                        </button>
                        <button
                            onClick={publish}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                        >
                            <Globe className="h-3.5 w-3.5" /> Publish
                        </button>
                    </div>
                </div>

                {/* React Flow canvas */}
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    onPaneClick={() => setSelectedNodeId(null)}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    className="!bg-transparent"
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={24}
                        size={1}
                        color="rgba(255,255,255,0.08)"
                    />
                    <Controls />
                    <MiniMap
                        nodeColor={(n) => {
                            const wf = (n as CanvasNode).data.workflowNode;
                            const def = wf
                                ? NODE_REGISTRY.find(
                                    (d) => d.type === wf.type && d.kind === wf.data.kind
                                )
                                : undefined;
                            return def?.color ?? "#64748b";
                        }}
                        maskColor="rgba(0,0,0,0.4)"
                    />
                </ReactFlow>

                {/* Error toast */}
                {error && workflow && (
                    <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/90 px-4 py-2 text-sm text-red-400 backdrop-blur-lg">
                        {error}
                        <button className="ml-3 text-red-300" onClick={() => setError(null)}>
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Node config panel */}
            {selectedNode && (
                <div className="w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-black/20 p-4 backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold">Node Settings</div>
                            <div className="text-xs text-muted-foreground">
                                {selectedNode.id.slice(0, 8)}
                            </div>
                        </div>
                        <button
                            onClick={deleteSelected}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>

                    <NodeConfigEditor
                        node={selectedNode}
                        onChange={(config) => updateNodeConfig(selectedNode.id, config)}
                    />
                </div>
            )}
        </div>
    );
}

function NodeConfigEditor({
    node,
    onChange,
}: {
    node: CanvasNode;
    onChange: (config: Record<string, unknown>) => void;
}) {
    const wfNode = node.data.workflowNode;
    const def = wfNode
        ? NODE_REGISTRY.find((d) => d.type === wfNode.type && d.kind === wfNode.data.kind)
        : undefined;
    const config = wfNode?.data.config ?? {};

    const set = (key: string, value: unknown) => {
        onChange({ ...config, [key]: value });
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Label
                </label>
                <input
                    value={node.data.label ?? def?.label ?? ""}
                    onChange={(e) => set("label", e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
            </div>

            {def && (
                <div className="rounded-lg bg-white/5 p-3 text-xs text-muted-foreground">
                    <span className="font-medium" style={{ color: def.color }}>
                        {def.icon} {def.label}
                    </span>
                    {" — "}
                    {def.description}
                </div>
            )}

            {Object.entries(config).map(([key, value]) => (
                <ConfigField
                    key={key}
                    name={key}
                    value={value}
                    onChange={(v) => set(key, v)}
                />
            ))}
        </div>
    );
}

function ObjectConfigField({ label, value, onChange }: { label: string, value: unknown, onChange: (v: unknown) => void }) {
    const [text, setText] = useState(JSON.stringify(value, null, 2));
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {label}
            </label>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => {
                    try {
                        onChange(JSON.parse(text));
                    } catch {
                        /* keep invalid JSON */
                    }
                }}
                rows={3}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs outline-none focus:border-primary/50"
            />
        </div>
    );
}

function ConfigField({
    name,
    value,
    onChange,
}: {
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
}) {
    const label = name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase());

    if (typeof value === "string" && value.length > 60) {
        return (
            <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                </label>
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs outline-none focus:border-primary/50"
                />
            </div>
        );
    }

    if (typeof value === "boolean") {
        return (
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <button
                    onClick={() => onChange(!value)}
                    className={`h-5 w-9 rounded-full transition ${value ? "bg-primary" : "bg-white/10"}`}
                >
                    <div
                        className={`h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0.5"
                            }`}
                    />
                </button>
            </div>
        );
    }

    if (name === "provider") {
        return (
            <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                </label>
                <select
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                >
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
        );
    }

    if (name === "keyMode") {
        return (
            <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                </label>
                <select
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                >
                    <option value="platform">Platform Key (ultron managed)</option>
                    <option value="custom">Custom Key (BYOK)</option>
                </select>
            </div>
        );
    }

    if (typeof value === "object" && value !== null) {
        return <ObjectConfigField label={label} value={value} onChange={onChange} />;
    }

    if (typeof value === "number") {
        return (
            <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                </label>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
            </div>
        );
    }

    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {label}
            </label>
            <input
                value={String(value ?? "")}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            />
        </div>
    );
}
