/**
 * Interactive term graph (React island, @xyflow/react). Receives a finished picture - positions come from the
 * build-time ELK layout (lib/layout.ts) - and adds what static SVG cannot: pan/zoom, and a detail panel that
 * shows the selected term's definition and where it is taught. Rendered by MindMap.astro with `client:only`,
 * which also prints the same graph as a text list for readers without JS.
 */
import { useMemo, useState } from 'react';
import {
	Background,
	Controls,
	Handle,
	MarkerType,
	Position,
	ReactFlow,
	type Edge,
	type Node,
	type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './graph.css';
import { Frame } from './Frame';
import { FIT_ZOOM } from '../../lib/fit';
import type { EdgeType } from '../../lib/graph';

export interface ViewNode {
	id: string;
	label: string;
	def: string;
	/** Layer depth index (0 = most abstract); selects the node color. */
	layer: number;
	layerLabel: string;
	/** Where the term is taught (lesson page) or defined (glossary anchor). */
	href: string;
	hrefLabel: string;
	x: number;
	y: number;
	w: number;
	h: number;
	/** The term the map is centered on. */
	focus: boolean;
}

export interface ViewEdge {
	from: string;
	to: string;
	type: EdgeType;
	label?: string;
}

export interface GraphViewProps {
	nodes: ViewNode[];
	edges: ViewEdge[];
	/** Canvas height in px. */
	height: number;
	/** Edge types present, for the legend. */
	legend: EdgeType[];
	/** Layers present in this map with their global depth index (which selects the color). */
	layers: { label: string; index: number }[];
}

/** Edge look per type; the legend uses the same table. `true` = draw an arrowhead at the target. */
export const EDGE_STYLE: Record<EdgeType, { dash?: string; arrow: boolean; text: string; muted: boolean }> = {
	'built-on': { arrow: true, text: 'is built on', muted: false },
	'is-a': { dash: '7 4', arrow: true, text: 'is a kind of', muted: false },
	'part-of': { dash: '2 4', arrow: true, text: 'is part of', muted: false },
	uses: { arrow: true, text: 'uses', muted: true },
	related: { dash: '4 4', arrow: false, text: 'related to', muted: true },
};

type TermNodeData = ViewNode & Record<string, unknown>;

function TermNode({ data, selected }: NodeProps<Node<TermNodeData>>) {
	return (
		<div
			className={`ck-node ck-layer-${data.layer % 6}${data.focus ? ' is-focus' : ''}${selected ? ' is-selected' : ''}`}
			style={{ width: data.w, height: data.h }}
			title={data.def}
		>
			<Handle type="target" position={Position.Top} isConnectable={false} />
			<span>{data.label}</span>
			<Handle type="source" position={Position.Bottom} isConnectable={false} />
		</div>
	);
}

const nodeTypes = { term: TermNode };

export default function GraphView({ nodes, edges, height, legend, layers }: GraphViewProps) {
	const [sel, setSel] = useState<string | null>(nodes.find((n) => n.focus)?.id ?? null);

	const rfNodes = useMemo<Node<TermNodeData>[]>(
		() =>
			nodes.map((n) => ({
				id: n.id,
				type: 'term',
				position: { x: n.x, y: n.y },
				width: n.w,
				height: n.h,
				data: n as TermNodeData,
				draggable: false,
				connectable: false,
			})),
		[nodes],
	);

	const rfEdges = useMemo<Edge[]>(
		() =>
			edges.map((e, i) => {
				const s = EDGE_STYLE[e.type];
				return {
					id: `${e.from}-${e.type}-${e.to}-${i}`,
					source: e.from,
					target: e.to,
					type: 'smoothstep',
					label: e.label,
					className: `ck-edge${s.muted ? ' is-muted' : ''}`,
					style: s.dash ? { strokeDasharray: s.dash } : undefined,
					markerEnd: s.arrow ? { type: MarkerType.ArrowClosed, width: 16, height: 16 } : undefined,
				};
			}),
		[edges],
	);

	const cur = nodes.find((n) => n.id === sel);

	return (
		<div className="ck-graph">
			<Frame height={height}>
				<ReactFlow
					nodes={rfNodes}
					edges={rfEdges}
					nodeTypes={nodeTypes}
					fitView
					fitViewOptions={{ padding: 0.12, minZoom: FIT_ZOOM.min, maxZoom: FIT_ZOOM.max }}
					minZoom={0.3}
					maxZoom={2}
					// The page must keep scrolling over the map; zoom with the controls, pinch or ctrl+wheel.
					zoomOnScroll={false}
					preventScrolling={false}
					nodesDraggable={false}
					nodesConnectable={false}
					elementsSelectable
					onNodeClick={(_, n) => setSel(n.id)}
					onPaneClick={() => setSel(null)}
					proOptions={{ hideAttribution: true }}
				>
					<Background gap={24} size={1} />
					<Controls showInteractive={false} />
				</ReactFlow>
			</Frame>
			<div className="ck-graph-info" aria-live="polite">
				{cur ? (
					<>
						<p className="ck-graph-title">
							<b>{cur.label}</b> <span className="ck-badge">{cur.layerLabel}</span>
						</p>
						<p>{cur.def}</p>
						<a href={cur.href}>{cur.hrefLabel}</a>
					</>
				) : (
					<p className="ck-muted">Click a term to see what it is and where it is taught.</p>
				)}
			</div>
			<ul className="ck-legend" aria-label="Legend">
				{legend.map((t) => (
					<li key={t}>
						<svg width="34" height="10" aria-hidden="true">
							<line x1="1" y1="5" x2="33" y2="5" strokeDasharray={EDGE_STYLE[t].dash} />
						</svg>
						{EDGE_STYLE[t].text}
					</li>
				))}
				{layers.map((l) => (
					<li key={l.label}>
						<span className={`ck-swatch ck-layer-${l.index % 6}`} aria-hidden="true" />
						{l.label}
					</li>
				))}
			</ul>
		</div>
	);
}
