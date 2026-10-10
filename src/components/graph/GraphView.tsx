/**
 * Interactive term graph (React island, @xyflow/react) in node-editor style: nodes with a colored title bar and
 * ports, smooth wires, draggable nodes. Reading order: foundations at the top, wires run down to what is built on
 * them (positions from the build-time layout, lib/layout.ts). Clicking a node shows its definition, its relations
 * (edge labels live there, not on the canvas) and where it is taught. Rendered by MindMap.astro with
 * `client:only`, which also prints the graph as text for readers without JS.
 */
import { useMemo, useState } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './graph.css';
import { Frame } from './Frame';
import { heat, useFlowNodes } from './flow';
import { FIT_ZOOM, alignTop } from '../../lib/fit';
import { REL_KEY, ui } from '../../i18n.mjs';
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
	/** The terms the map is about (lesson terms, or the term it is centered on). */
	focus: boolean;
	/** Monospace title: API identifiers such as `VkDevice`. */
	code: boolean;
}

/** A relation as stored in terms.json: `from` <type> `to` ("device is built on physical device"). */
export interface ViewEdge {
	from: string;
	to: string;
	type: EdgeType;
	label?: string;
}

export interface GraphViewProps {
	/** Page language: interface texts come from the engine's table (i18n.mjs). */
	lang: string;
	nodes: ViewNode[];
	edges: ViewEdge[];
	/** Canvas height in px. */
	height: number;
	/** Edge types present, for the legend. */
	legend: EdgeType[];
	/** Layers present in this map with their global depth index (which selects the color). */
	layers: { label: string; index: number }[];
}

/**
 * Edge look per type; the legend uses the same table. Names come from the interface texts (REL_KEY): `rel` reads
 * from the relation's `from` term ("device is built on physical device"), `wire` names the wire as drawn, top down.
 */
export const EDGE_STYLE: Record<EdgeType, { dash?: string; arrow: boolean; muted: boolean }> = {
	'built-on': { arrow: true, muted: false },
	'is-a': { dash: '7 5', arrow: true, muted: false },
	'part-of': { dash: '2 5', arrow: true, muted: false },
	uses: { arrow: true, muted: true },
	related: { dash: '4 5', arrow: false, muted: true },
};

type TermData = ViewNode & Record<string, unknown>;

function TermNode({ data, selected }: NodeProps<Node<TermData>>) {
	return (
		<div
			className={`ck-node ck-layer-${data.layer % 6}${data.focus ? ' is-focus' : ''}${selected ? ' is-selected' : ''}`}
			style={{ width: data.w, height: data.h }}
			title={data.def}
		>
			<Handle type="target" position={Position.Top} isConnectable={false} />
			<div className={`ck-node-head${data.code ? ' is-code' : ''}`}>
				<span>{data.label}</span>
			</div>
			<div className="ck-node-body">{data.layerLabel}</div>
			<Handle type="source" position={Position.Bottom} isConnectable={false} />
		</div>
	);
}

const nodeTypes = { term: TermNode };

export default function GraphView({ lang, nodes, edges, height, legend, layers }: GraphViewProps) {
	const t = ui(lang);
	const [sel, setSel] = useState<string | null>(nodes.find((n) => n.focus)?.id ?? null);
	const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

	const initial = useMemo<Node<TermData>[]>(
		() =>
			nodes.map((n) => ({
				id: n.id,
				type: 'term',
				position: { x: n.x, y: n.y },
				width: n.w,
				height: n.h,
				data: n as TermData,
				connectable: false,
			})),
		[nodes],
	);
	const { nodes: rfNodes, onNodesChange, reset } = useFlowNodes(initial);

	// Wires run from the foundation (`to`, drawn above) down to what is built on it (`from`).
	const rfEdges = useMemo<Edge[]>(
		() =>
			edges.map((e, i) => {
				const s = EDGE_STYLE[e.type];
				return {
					id: `${e.from}-${e.type}-${e.to}-${i}`,
					source: e.to,
					target: e.from,
					type: 'default',
					className: `ck-edge${s.muted ? ' is-muted' : ''}`,
					style: s.dash ? { strokeDasharray: s.dash } : undefined,
					markerEnd: s.arrow ? { type: MarkerType.ArrowClosed, width: 14, height: 14 } : undefined,
				};
			}),
		[edges],
	);

	const cur = sel ? byId.get(sel) : undefined;
	const relations = cur ? edges.filter((e) => e.from === cur.id || e.to === cur.id) : [];

	return (
		<div className="ck-graph">
			<Frame lang={lang} height={height} onReset={reset}>
				<ReactFlow
					nodes={rfNodes}
					edges={heat(rfEdges, sel)}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					fitView
					fitViewOptions={{ padding: 0.12, minZoom: FIT_ZOOM.min, maxZoom: FIT_ZOOM.max }}
					onInit={alignTop}
					minZoom={0.3}
					maxZoom={2}
					// The page must keep scrolling over the map; zoom with the controls, pinch or ctrl+wheel.
					zoomOnScroll={false}
					preventScrolling={false}
					nodesConnectable={false}
					onNodeClick={(_, n) => setSel(n.id)}
					onPaneClick={() => setSel(null)}
					proOptions={{ hideAttribution: true }}
				>
					<Background gap={22} size={1.2} />
					<Controls showInteractive={false} />
				</ReactFlow>
			</Frame>
			<div className="ck-graph-info" aria-live="polite">
				{cur ? (
					<>
						<p className="ck-graph-title">
							<b className={cur.code ? 'is-code' : undefined}>{cur.label}</b> <span className="ck-badge">{cur.layerLabel}</span>
						</p>
						<p>{cur.def}</p>
						{relations.length > 0 && (
							<ul className="ck-relations">
								{relations.map((e, i) => (
									<li key={i}>
										{byId.get(e.from)?.label} <em>{e.label ?? t[REL_KEY[e.type].rel]}</em> {byId.get(e.to)?.label}
									</li>
								))}
							</ul>
						)}
						<a href={cur.href}>{cur.hrefLabel}</a>
					</>
				) : (
					<p className="ck-muted">{t.graphHint}</p>
				)}
			</div>
			<div className="ck-legend" aria-label="Legend">
				<span className="ck-legend-note">{t.graphLegendNote}</span>
				<ul>
					{legend.map((type) => (
						<li key={type}>
							<svg width="34" height="10" aria-hidden="true">
								<line x1="1" y1="5" x2="33" y2="5" strokeDasharray={EDGE_STYLE[type].dash} />
							</svg>
							{t[REL_KEY[type].wire]}
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
		</div>
	);
}
