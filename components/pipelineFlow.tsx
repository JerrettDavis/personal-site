import {useCallback, useEffect, useMemo, useRef} from 'react';
import ReactFlow, {
    Background,
    type Edge,
    Handle,
    MarkerType,
    type Node,
    type NodeProps,
    Position,
    type ReactFlowInstance,
} from 'reactflow';
import styles from './pipelineFlow.module.css';

export interface PipelineLane {
    id: string;
    label: string;
    summary: string;
}

export interface PipelineNode {
    id: string;
    lane: string;
    title: string;
    meta: string;
    step: number;
    order?: number;
    column?: number;
}

export interface PipelineEdge {
    id: string;
    source: string;
    target: string;
    step: number;
}

interface PipelineFlowProps {
    lanes: PipelineLane[];
    nodes: PipelineNode[];
    edges: PipelineEdge[];
    activeStepIndex: number;
    isPlaying: boolean;
    onSelectStep: (stepIndex: number) => void;
}

const baseLaneHeight = 140;
const laneGapPadding = 40;
const stepGap = 240;
const nodeOffsetX = 260;
const laneOffsetX = 0;
const nodeWidth = 170;
const nodeHeight = 58;
const stackPadding = 12;
const trackStride = nodeHeight + stackPadding;

const getColumn = (node: PipelineNode) => node.column ?? node.step;

const LaneNode = ({data}: NodeProps<{label: string; summary: string; tone: 'even' | 'odd'}>) => (
    <div className={styles.laneNode} data-tone={data.tone}>
        <span className={styles.laneTitle}>{data.label}</span>
        <span className={styles.laneSummary}>{data.summary}</span>
    </div>
);

type HandleSpec = {
    id: string;
    top: number;
};

const buildHandlePositions = (count: number): number[] => {
    if (count <= 0) return [];
    if (count === 1) return [50];
    if (count === 2) return [30, 70];
    if (count === 3) return [20, 50, 80];
    const step = 60 / (count - 1);
    return Array.from({length: count}, (_, index) => 20 + index * step);
};

const PipelineNodeView = ({
    data,
}: NodeProps<{
    title: string;
    meta: string;
    active: boolean;
    current: boolean;
    inHandles: HandleSpec[];
    outHandles: HandleSpec[];
}>) => (
    <div
        className={`${styles.flowNode} ${data.active ? styles.flowNodeActive : ''} ${
            data.current ? styles.flowNodeCurrent : ''
        }`}
    >
        {data.inHandles.map((handle) => (
            <Handle
                key={handle.id}
                type="target"
                position={Position.Left}
                className={styles.flowHandle}
                id={handle.id}
                style={{top: `${handle.top}%`}}
            />
        ))}
        {data.outHandles.map((handle) => (
            <Handle
                key={handle.id}
                type="source"
                position={Position.Right}
                className={styles.flowHandle}
                id={handle.id}
                style={{top: `${handle.top}%`}}
            />
        ))}
        <span className={styles.flowNodeTitle}>{data.title}</span>
        <span className={styles.flowNodeMeta}>{data.meta}</span>
    </div>
);

const nodeTypes = {
    lane: LaneNode,
    pipeline: PipelineNodeView,
};

export default function PipelineFlow({
    lanes,
    nodes,
    edges,
    activeStepIndex,
    isPlaying,
    onSelectStep,
}: PipelineFlowProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const hasUserViewportRef = useRef(false);
    const nodeById = useMemo(() => {
        const map = new Map<string, PipelineNode>();
        nodes.forEach((node) => map.set(node.id, node));
        return map;
    }, [nodes]);
    const laneIndexById = useMemo(() => {
        const map = new Map<string, number>();
        lanes.forEach((lane, index) => map.set(lane.id, index));
        return map;
    }, [lanes]);

    const layout = useMemo(() => {
        const incomingSameLaneByNode = new Map<string, string[]>();
        const laneNodes = new Map<string, PipelineNode[]>();
        nodes.forEach((node) => {
            const group = laneNodes.get(node.lane) ?? [];
            group.push(node);
            laneNodes.set(node.lane, group);
        });

        edges.forEach((edge) => {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);
            if (!source || !target) return;
            if (source.lane !== target.lane) return;
            const list = incomingSameLaneByNode.get(edge.target) ?? [];
            list.push(edge.source);
            incomingSameLaneByNode.set(edge.target, list);
        });

        const trackByNode = new Map<string, number>();
        const trackCountByLane = new Map<string, number>();
        const laneStepUsedTracks = new Map<string, Set<number>>();

        laneNodes.forEach((laneGroup, laneId) => {
            const orderedLaneNodes = [...laneGroup].sort((a, b) => {
                const columnA = getColumn(a);
                const columnB = getColumn(b);
                if (columnA !== columnB) return columnA - columnB;
                return (a.order ?? 0) - (b.order ?? 0);
            });
            orderedLaneNodes.forEach((node) => {
                const nodeColumn = getColumn(node);
                const parentIds = incomingSameLaneByNode.get(node.id) ?? [];
                const parentTracks = new Set<number>();
                parentIds.forEach((parentId) => {
                    const parentNode = nodeById.get(parentId);
                    if (!parentNode || getColumn(parentNode) !== nodeColumn) return;
                    const track = trackByNode.get(parentId);
                    if (typeof track === 'number') parentTracks.add(track);
                });
                const stepKey = `${laneId}-${nodeColumn}`;
                const usedTracks = laneStepUsedTracks.get(stepKey) ?? new Set<number>();
                let track = 0;
                while (parentTracks.has(track) || usedTracks.has(track)) {
                    track += 1;
                }
                usedTracks.add(track);
                laneStepUsedTracks.set(stepKey, usedTracks);
                trackByNode.set(node.id, track);
                const currentMax = trackCountByLane.get(laneId) ?? 0;
                trackCountByLane.set(laneId, Math.max(currentMax, track + 1));
            });
        });

        const maxTracks = Math.max(1, ...Array.from(trackCountByLane.values()));
        const laneHeight = Math.max(baseLaneHeight, maxTracks * trackStride + stackPadding);
        const laneGap = laneHeight + laneGapPadding;

        return {trackByNode, trackCountByLane, laneHeight, laneGap};
    }, [edges, nodeById, nodes]);

    const {nodeHandles, edgeHandles} = useMemo(() => {
        const incomingByNode = new Map<string, PipelineEdge[]>();
        const outgoingByNode = new Map<string, PipelineEdge[]>();
        edges.forEach((edge) => {
            const incoming = incomingByNode.get(edge.target) ?? [];
            incoming.push(edge);
            incomingByNode.set(edge.target, incoming);
            const outgoing = outgoingByNode.get(edge.source) ?? [];
            outgoing.push(edge);
            outgoingByNode.set(edge.source, outgoing);
        });

        const nodeOrder = new Map<string, number>();
        nodes.forEach((node, index) => {
            nodeOrder.set(node.id, index);
        });

        const nodeHandlesMap = new Map<string, {inHandles: HandleSpec[]; outHandles: HandleSpec[]}>();
        const edgeHandlesMap = new Map<string, {sourceHandle?: string; targetHandle?: string}>();

        nodes.forEach((node) => {
            const incoming = [...(incomingByNode.get(node.id) ?? [])].sort((a, b) => {
                const sourceNodeA = nodeById.get(a.source);
                const sourceNodeB = nodeById.get(b.source);
                const sourceLaneA = sourceNodeA?.lane ?? '';
                const sourceLaneB = sourceNodeB?.lane ?? '';
                if (sourceLaneA !== sourceLaneB) {
                    return (laneIndexById.get(sourceLaneA) ?? 0) - (laneIndexById.get(sourceLaneB) ?? 0);
                }
                const columnA = sourceNodeA ? getColumn(sourceNodeA) : 0;
                const columnB = sourceNodeB ? getColumn(sourceNodeB) : 0;
                if (columnA !== columnB) {
                    return columnA - columnB;
                }
                return (layout.trackByNode.get(a.source) ?? 0) - (layout.trackByNode.get(b.source) ?? 0);
            });
            const outgoing = [...(outgoingByNode.get(node.id) ?? [])].sort((a, b) => {
                const targetNodeA = nodeById.get(a.target);
                const targetNodeB = nodeById.get(b.target);
                const targetLaneA = targetNodeA?.lane ?? '';
                const targetLaneB = targetNodeB?.lane ?? '';
                if (targetLaneA !== targetLaneB) {
                    return (laneIndexById.get(targetLaneA) ?? 0) - (laneIndexById.get(targetLaneB) ?? 0);
                }
                const columnA = targetNodeA ? getColumn(targetNodeA) : 0;
                const columnB = targetNodeB ? getColumn(targetNodeB) : 0;
                if (columnA !== columnB) {
                    return columnA - columnB;
                }
                return (layout.trackByNode.get(a.target) ?? 0) - (layout.trackByNode.get(b.target) ?? 0);
            });
            const inPositions = buildHandlePositions(incoming.length);
            const outPositions = buildHandlePositions(outgoing.length);
            const inHandles = inPositions.map((top, index) => ({id: `in-${index}`, top}));
            const outHandles = outPositions.map((top, index) => ({id: `out-${index}`, top}));
            incoming.forEach((edge, index) => {
                edgeHandlesMap.set(edge.id, {
                    ...(edgeHandlesMap.get(edge.id) ?? {}),
                    targetHandle: inHandles[index]?.id,
                });
            });
            outgoing.forEach((edge, index) => {
                edgeHandlesMap.set(edge.id, {
                    ...(edgeHandlesMap.get(edge.id) ?? {}),
                    sourceHandle: outHandles[index]?.id,
                });
            });
            nodeHandlesMap.set(node.id, {inHandles, outHandles});
        });

        return {nodeHandles: nodeHandlesMap, edgeHandles: edgeHandlesMap};
    }, [edges, laneIndexById, layout.trackByNode, nodeById, nodes]);

    const baseNodes: Node[] = useMemo(() => {
        const maxColumn = nodes.reduce((max, node) => Math.max(max, getColumn(node)), 0);
        const laneWidth = nodeOffsetX + (maxColumn + 1) * stepGap + nodeWidth;
        const laneNodes: Node[] = lanes.map((lane, index) => ({
            id: `lane-${lane.id}`,
            type: 'lane',
            data: {label: lane.label, summary: lane.summary, tone: index % 2 === 0 ? 'even' : 'odd'},
            position: {x: laneOffsetX, y: index * layout.laneGap},
            draggable: false,
            selectable: false,
            width: laneWidth,
            height: layout.laneHeight,
            style: {
                width: laneWidth,
                height: layout.laneHeight,
                zIndex: 0,
            },
        }));

        const pipelineNodes: Node[] = nodes.map((node) => {
            const laneIndex = laneIndexById.get(node.lane) ?? 0;
            const trackIndex = layout.trackByNode.get(node.id) ?? 0;
            const trackCount = layout.trackCountByLane.get(node.lane) ?? 1;
            const laneOffset = (layout.laneHeight - trackStride * trackCount) / 2;
            const baseY = laneIndex * layout.laneGap + laneOffset;
            const nodeColumn = getColumn(node);
            const handleSpec = nodeHandles.get(node.id) ?? {inHandles: [], outHandles: []};
            return {
                id: node.id,
                type: 'pipeline',
                data: {
                    title: node.title,
                    meta: node.meta,
                    step: node.step,
                    inHandles: handleSpec.inHandles,
                    outHandles: handleSpec.outHandles,
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
                width: nodeWidth,
                height: nodeHeight,
                position: {
                    x: nodeOffsetX + nodeColumn * stepGap,
                    y: baseY + trackIndex * trackStride,
                },
                draggable: false,
                style: {
                    width: nodeWidth,
                    height: nodeHeight,
                    zIndex: 2,
                },
            };
        });

        return [...laneNodes, ...pipelineNodes];
    }, [laneIndexById, lanes, layout.laneGap, layout.laneHeight, layout.trackByNode, layout.trackCountByLane, nodeHandles, nodes]);

    const flowNodes: Node[] = useMemo(() => {
        return baseNodes.map((node) => {
            if (node.type !== 'pipeline') return node;
            const data = node.data as {
                title: string;
                meta: string;
                step: number;
                inHandles: HandleSpec[];
                outHandles: HandleSpec[];
            };
            return {
                ...node,
                data: {
                    ...data,
                    active: data.step <= activeStepIndex,
                    current: data.step === activeStepIndex,
                },
            };
        });
    }, [activeStepIndex, baseNodes]);

    const flowEdges: Edge[] = useMemo(() => {
        return edges.map((edge) => {
            const isCurrent = edge.step === activeStepIndex;
            const isActive = edge.step <= activeStepIndex;
            const stroke = isCurrent
                ? 'var(--color-primary)'
                : isActive
                    ? 'var(--color-link)'
                    : 'var(--color-border)';
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: 'step',
                animated: isPlaying && isCurrent,
                sourceHandle: edgeHandles.get(edge.id)?.sourceHandle,
                targetHandle: edgeHandles.get(edge.id)?.targetHandle,
                style: {
                    stroke,
                    strokeWidth: 3,
                    strokeOpacity: isActive ? 1 : 0.6,
                },
                pathOptions: {borderRadius: 6},
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: stroke,
                },
            };
        });
    }, [activeStepIndex, edgeHandles, edges, isPlaying]);

    const handleNodeClick = useCallback(
        (_: unknown, node: Node) => {
            const stepValue = node?.data?.step;
            if (typeof stepValue === 'number') {
                onSelectStep(stepValue);
            }
        },
        [onSelectStep],
    );

    const updateViewport = useCallback((force = false) => {
        if (!force && hasUserViewportRef.current) return;
        const instance = flowInstanceRef.current;
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!instance || !rect) return;
        const padding = 32;
        const bounds = baseNodes.reduce(
            (acc, node) => {
                const width = node.width ?? 0;
                const height = node.height ?? 0;
                acc.minX = Math.min(acc.minX, node.position.x);
                acc.minY = Math.min(acc.minY, node.position.y);
                acc.maxX = Math.max(acc.maxX, node.position.x + width);
                acc.maxY = Math.max(acc.maxY, node.position.y + height);
                return acc;
            },
            {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity},
        );
        if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) return;
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const zoomX = (rect.width - padding * 2) / width;
        const zoomY = (rect.height - padding * 2) / height;
        const zoom = Math.min(zoomX, zoomY, 1);
        const x = padding - bounds.minX * zoom;
        const y = padding - bounds.minY * zoom;
        instance.setViewport({x, y, zoom});
    }, [baseNodes]);

    const handleInit = useCallback(
        (instance: ReactFlowInstance) => {
            flowInstanceRef.current = instance;
            requestAnimationFrame(() => updateViewport(true));
        },
        [updateViewport],
    );

    useEffect(() => {
        updateViewport();
    }, [updateViewport]);

    useEffect(() => {
        const handleResize = () => updateViewport();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateViewport]);

    const handleMoveStart = useCallback(() => {
        hasUserViewportRef.current = true;
    }, []);

    return (
        <div className={styles.flowWrap} ref={wrapRef}>
            <ReactFlow
                className={styles.flow}
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag
                disableKeyboardA11y
                deleteKeyCode={null}
                selectionKeyCode={null}
                multiSelectionKeyCode={null}
                panActivationKeyCode={null}
                zoomActivationKeyCode={null}
                minZoom={0.65}
                maxZoom={1.1}
                onNodeClick={handleNodeClick}
                onMoveStart={handleMoveStart}
                onInit={handleInit}
            >
                <Background gap={24} size={1} color="rgba(37, 104, 255, 0.2)" />
            </ReactFlow>
        </div>
    );
}
