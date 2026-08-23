import '@xyflow/react/dist/style.css';

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';
import {
  applyNodeChanges,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getStraightPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  StructuredPlanDependencyGraph as PlanDependencyGraph,
  StructuredPlanLayer,
  StructuredPlanModule,
} from '../../nodes/structured-plan/config';

const NODE_RADIUS = 44;
const NODE_DIAMETER = NODE_RADIUS * 2;
const FORCE_TICKS = 400;
const LAYOUT_MARGIN = 80;
const EDGE_ARROW_OFFSET = 8;

export type DependencyGraphLayoutParams = {
  initialRadius: number;
  linkDistance: number;
  linkStrength: number;
  repulsion: number;
  collidePadding: number;
};

export const DEFAULT_DEPENDENCY_GRAPH_LAYOUT_PARAMS: DependencyGraphLayoutParams = {
  initialRadius: 200,
  linkDistance: 240,
  linkStrength: 0.55,
  repulsion: 900,
  collidePadding: 48,
};

const LAYOUT_PARAM_BOUNDS = {
  initialRadius: { min: 100, max: 320, step: 10 },
  linkDistance: { min: 120, max: 400, step: 10 },
  linkStrength: { min: 0.2, max: 1, step: 0.05 },
  repulsion: { min: 300, max: 1500, step: 50 },
  collidePadding: { min: 12, max: 96, step: 4 },
} as const;

export type DependencyGraphNode = Node<{
  label: string;
  moduleId: string;
  layer: StructuredPlanLayer;
}, 'module'>;

export type DependencyGraphEdge = Edge<{ description: string }>;

type CanvasNodeData = {
  label: string;
  moduleId: string;
  layer: StructuredPlanLayer;
  onSelect: (moduleId: string) => void;
};

function compareIds(left: string, right: string): number {
  return left.localeCompare(right);
}

function moduleTitle(
  modules: readonly StructuredPlanModule[],
  moduleId: string,
): string {
  return modules.find((module) => module.id === moduleId)?.title ?? moduleId;
}

function moduleLayer(
  modules: readonly StructuredPlanModule[],
  moduleId: string,
): StructuredPlanLayer {
  return modules.find((module) => module.id === moduleId)?.layer ?? 'feature';
}

function graphLayoutSeed(graph: PlanDependencyGraph): string {
  const nodes = graph.nodes.map((node) => node.moduleId).sort().join(',');
  const edges = graph.edges
    .map((edge) => `${edge.sourceModuleId}->${edge.targetModuleId}`)
    .sort()
    .join(',');
  return `${graph.generatedAt}|${nodes}|${edges}`;
}

export function layoutDependencyGraph(
  modules: readonly StructuredPlanModule[],
  graph: PlanDependencyGraph,
  layoutParams: DependencyGraphLayoutParams = DEFAULT_DEPENDENCY_GRAPH_LAYOUT_PARAMS,
): { nodes: DependencyGraphNode[]; edges: DependencyGraphEdge[] } {
  const nodes = [...graph.nodes].sort((left, right) => compareIds(left.moduleId, right.moduleId));
  const edges = [...graph.edges].sort((left, right) => {
    const source = compareIds(left.sourceModuleId, right.sourceModuleId);
    return source !== 0 ? source : compareIds(left.targetModuleId, right.targetModuleId);
  });

  const nodeIds = new Set(nodes.map((node) => node.moduleId));
  const validEdges = edges.filter((edge) => (
    nodeIds.has(edge.sourceModuleId) && nodeIds.has(edge.targetModuleId)
  ));

  const simNodes = nodes.map((node, index) => ({
    id: node.moduleId,
    x: Math.cos((2 * Math.PI * index) / nodes.length) * layoutParams.initialRadius,
    y: Math.sin((2 * Math.PI * index) / nodes.length) * layoutParams.initialRadius,
  }));
  const idIndex = new Map(simNodes.map((node) => [node.id, node]));
  const simLinks = validEdges.map((edge) => ({
    source: idIndex.get(edge.sourceModuleId)!,
    target: idIndex.get(edge.targetModuleId)!,
  }));

  const simulation = forceSimulation(simNodes)
    .force('charge', forceManyBody().strength(-layoutParams.repulsion))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(NODE_RADIUS + layoutParams.collidePadding))
    .force(
      'link',
      forceLink(simLinks)
        .id((node) => (node as { id: string }).id)
        .distance(layoutParams.linkDistance)
        .strength(layoutParams.linkStrength),
    )
    .stop();

  for (let tick = 0; tick < FORCE_TICKS; tick += 1) simulation.tick();

  // d3-force centers the layout at the origin, producing negative coordinates.
  // React Flow's default viewport starts at (0, 0), so shift the layout into the
  // positive quadrant to keep every node visible without relying on fitView.
  let minX = 0;
  let minY = 0;
  for (const node of simNodes) {
    minX = Math.min(minX, node.x ?? 0);
    minY = Math.min(minY, node.y ?? 0);
  }
  const offsetX = LAYOUT_MARGIN - minX;
  const offsetY = LAYOUT_MARGIN - minY;

  return {
    nodes: nodes.map((node) => {
      const laidOut = idIndex.get(node.moduleId) ?? { x: 0, y: 0 };
      return {
        id: node.moduleId,
        type: 'module',
        position: {
          x: (laidOut.x ?? 0) + offsetX - NODE_RADIUS,
          y: (laidOut.y ?? 0) + offsetY - NODE_RADIUS,
        },
        data: {
          label: moduleTitle(modules, node.moduleId),
          moduleId: node.moduleId,
          layer: moduleLayer(modules, node.moduleId),
        },
        width: NODE_DIAMETER,
        height: NODE_DIAMETER,
        draggable: true,
        connectable: false,
      };
    }),
    edges: validEdges.map((edge) => ({
      id: `${edge.sourceModuleId}->${edge.targetModuleId}`,
      type: 'dependency',
      source: edge.sourceModuleId,
      target: edge.targetModuleId,
      data: { description: edge.description },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#30363d',
      },
    })),
  };
}

function shortenEdgeEndpoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): { sourceX: number; sourceY: number; targetX: number; targetY: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.hypot(dx, dy) || 1;
  const unitX = dx / length;
  const unitY = dy / length;
  return {
    sourceX: sourceX + unitX * NODE_RADIUS,
    sourceY: sourceY + unitY * NODE_RADIUS,
    targetX: targetX - unitX * (NODE_RADIUS + EDGE_ARROW_OFFSET),
    targetY: targetY - unitY * (NODE_RADIUS + EDGE_ARROW_OFFSET),
  };
}

function StructuredPlanDependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps<DependencyGraphEdge>) {
  const endpoints = shortenEdgeEndpoints(sourceX, sourceY, targetX, targetY);
  const [edgePath, labelX, labelY] = getStraightPath(endpoints);
  const description = data?.description?.trim();

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
      {description ? (
        <EdgeLabelRenderer>
          <div
            className="structured-plan-dependency-graph__edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {description}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function StructuredPlanGraphModuleNode({
  id,
  data,
  selected,
}: NodeProps<Node<CanvasNodeData, 'module'>>) {
  return (
    <div className="structured-plan-dependency-graph__node-shell">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="structured-plan-dependency-graph__handle"
      />
      <div
        role="button"
        tabIndex={0}
        className={`structured-plan-dependency-graph__node nopan${selected ? ' is-selected' : ''} structured-plan-dependency-graph__node--layer-${data.layer}`}
        aria-pressed={selected}
        onClick={() => data.onSelect(id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            data.onSelect(id);
          }
        }}
      >
        <span className="structured-plan-dependency-graph__node-label">{data.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Top}
        isConnectable={false}
        className="structured-plan-dependency-graph__handle"
      />
    </div>
  );
}

function FitViewAfterLayout({ layoutKey }: { layoutKey: string }) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    if (!layoutKey || !nodesInitialized) return;
    void fitView({ padding: 0.12, duration: 0 });
  }, [fitView, layoutKey, nodesInitialized]);

  return null;
}

type LayoutParamKey = keyof DependencyGraphLayoutParams;

const LAYOUT_PARAM_LABELS: Record<LayoutParamKey, string> = {
  initialRadius: '初始分布',
  linkDistance: '连线距离',
  linkStrength: '连线拉力',
  repulsion: '节点斥力',
  collidePadding: '碰撞间距',
};

function LayoutSettingsPanel({
  params,
  onChange,
  onReset,
  onRelayout,
}: {
  params: DependencyGraphLayoutParams;
  onChange: (key: LayoutParamKey, value: number) => void;
  onReset: () => void;
  onRelayout: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`structured-plan-dependency-graph__layout-panel${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="structured-plan-dependency-graph__layout-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        布局参数
      </button>
      {open ? (
        <div className="structured-plan-dependency-graph__layout-body">
          {(Object.keys(LAYOUT_PARAM_LABELS) as LayoutParamKey[]).map((key) => {
            const bounds = LAYOUT_PARAM_BOUNDS[key];
            const value = params[key];
            return (
              <label key={key} className="structured-plan-dependency-graph__layout-field">
                <span className="structured-plan-dependency-graph__layout-field-label">
                  <span>{LAYOUT_PARAM_LABELS[key]}</span>
                  <span className="structured-plan-dependency-graph__layout-field-value">{value}</span>
                </span>
                <input
                  type="range"
                  aria-label={LAYOUT_PARAM_LABELS[key]}
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={value}
                  onChange={(event) => onChange(key, Number(event.target.value))}
                />
              </label>
            );
          })}
          <div className="structured-plan-dependency-graph__layout-actions">
            <button type="button" onClick={onRelayout}>重新布局</button>
            <button type="button" onClick={onReset}>恢复默认</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = {
  module: StructuredPlanGraphModuleNode,
} satisfies NodeTypes;

const edgeTypes = {
  dependency: StructuredPlanDependencyEdge,
} satisfies EdgeTypes;

function DependencyList({
  heading,
  items,
}: {
  heading: string;
  items: Array<{ id: string; title: string; description: string }>;
}) {
  return (
    <section>
      <h4>{heading}</h4>
      {items.length === 0 ? (
        <p>无</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              {item.description ? <p>{item.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StructuredPlanDependencyGraph({
  modules,
  graph,
}: {
  modules: readonly StructuredPlanModule[];
  graph: PlanDependencyGraph | null;
}) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [layoutParams, setLayoutParams] = useState(DEFAULT_DEPENDENCY_GRAPH_LAYOUT_PARAMS);
  const [relayoutKey, setRelayoutKey] = useState(0);
  const hasNodes = Boolean(graph && graph.nodes.length > 0);
  const layoutSeed = graph && hasNodes ? graphLayoutSeed(graph) : '';
  const layoutKey = `${layoutSeed}|${JSON.stringify(layoutParams)}|${relayoutKey}`;

  const [flowNodes, setFlowNodes] = useState<DependencyGraphNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<DependencyGraphEdge[]>([]);

  useEffect(() => {
    if (!graph || !hasNodes) {
      setFlowNodes([]);
      setFlowEdges([]);
      setSelectedModuleId(null);
      return;
    }

    const layout = layoutDependencyGraph(modules, graph, layoutParams);
    setFlowNodes(layout.nodes);
    setFlowEdges(layout.edges);
    setSelectedModuleId(null);
  }, [graph, hasNodes, layoutParams, layoutSeed, modules, relayoutKey]);

  useEffect(() => {
    setFlowNodes((current) => current.map((node) => ({
      ...node,
      data: {
        ...node.data,
        label: moduleTitle(modules, node.id),
      },
    })));
  }, [modules]);

  const onNodesChange = useCallback((changes: NodeChange<DependencyGraphNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const nodes = useMemo(
    () => flowNodes.map((node) => ({
      ...node,
      selected: node.id === selectedModuleId,
      data: { ...node.data, onSelect: setSelectedModuleId },
    })),
    [flowNodes, selectedModuleId],
  );

  const selectedTitle = selectedModuleId ? moduleTitle(modules, selectedModuleId) : null;
  const inbound = graph && selectedModuleId
    ? graph.edges
      .filter((edge) => edge.targetModuleId === selectedModuleId)
      .map((edge) => ({
        id: edge.sourceModuleId,
        title: moduleTitle(modules, edge.sourceModuleId),
        description: edge.description,
      }))
      .sort((left, right) => compareIds(left.title, right.title))
    : [];
  const outbound = graph && selectedModuleId
    ? graph.edges
      .filter((edge) => edge.sourceModuleId === selectedModuleId)
      .map((edge) => ({
        id: edge.targetModuleId,
        title: moduleTitle(modules, edge.targetModuleId),
        description: edge.description,
      }))
      .sort((left, right) => compareIds(left.title, right.title))
    : [];

  const clearSelection = useCallback(() => {
    setSelectedModuleId(null);
  }, []);

  const updateLayoutParam = useCallback((key: LayoutParamKey, value: number) => {
    setLayoutParams((current) => ({ ...current, [key]: value }));
  }, []);

  const resetLayoutParams = useCallback(() => {
    setLayoutParams(DEFAULT_DEPENDENCY_GRAPH_LAYOUT_PARAMS);
  }, []);

  const relayoutGraph = useCallback(() => {
    setRelayoutKey((current) => current + 1);
  }, []);

  return (
    <div className={`structured-plan-dependency-graph${hasNodes ? '' : ' is-empty'}`}>
      {graph?.stale ? (
        <div className="structured-plan-dependency-graph__banner" role="status">
          <p>依赖图谱已过期</p>
        </div>
      ) : null}
      {!graph ? (
        <div className="structured-plan-dependency-graph__empty">
          <p>尚未生成依赖图谱</p>
        </div>
      ) : !hasNodes ? (
        <div className="structured-plan-dependency-graph__empty">
          <p>依赖图谱为空</p>
        </div>
      ) : (
        <div className="structured-plan-dependency-graph__canvas">
          <ReactFlow
            nodes={nodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onPaneClick={clearSelection}
            nodesConnectable={false}
            nodesDraggable
            elementsSelectable
            deleteKeyCode={null}
            minZoom={0.35}
            maxZoom={1.8}
            defaultEdgeOptions={{ type: 'dependency' }}
          >
            <FitViewAfterLayout layoutKey={layoutKey} />
            <Controls showInteractive={false} />
          </ReactFlow>
          <LayoutSettingsPanel
            params={layoutParams}
            onChange={updateLayoutParam}
            onReset={resetLayoutParams}
            onRelayout={relayoutGraph}
          />
          {selectedTitle && selectedModuleId ? (
            <div
              className="structured-plan-dependency-graph__overlay"
              role="dialog"
              aria-label={selectedTitle}
            >
              <button
                type="button"
                className="structured-plan-dependency-graph__overlay-close"
                aria-label="关闭"
                onClick={clearSelection}
              >
                ×
              </button>
              <h3>{selectedTitle}</h3>
              <DependencyList heading="直接依赖" items={inbound} />
              <DependencyList heading="被以下模块依赖" items={outbound} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
