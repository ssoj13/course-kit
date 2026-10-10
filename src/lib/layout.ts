/**
 * Build-time layered graph layout with dagre (Sugiyama-style ranks, the layout react-flow's own examples use).
 * Graphs are laid out while the page is generated, so the browser receives fixed positions.
 *
 * Reading order is the same for every graph of a course: foundations / roots at the top, what is built on them
 * below, and inside one row left to right in course order. Callers state that order explicitly: a link puts its
 * `source` above its `target`, a node's `order` (course position) sorts its row.
 *
 * Why not ELK: elkjs decides at load time whether it runs inside a Web Worker by testing
 * `typeof document === 'undefined' && typeof self !== 'undefined'`; Bun defines `self`, so under Bun elkjs
 * exports nothing and `new ELK()` throws.
 */
import { graphlib, layout as dagreLayout, type OrderConstraint } from '@dagrejs/dagre';
import { FIT_ZOOM } from './fit';

export interface LayoutNode {
	id: string;
	label: string;
	/** Course position: smaller = earlier = further left within its row. Missing = input order. */
	order?: number;
}

export interface LayoutLink {
	/** Drawn above. */
	source: string;
	/** Drawn below. */
	target: string;
	/** Minimum number of rows the link spans (default 1); > 1 pushes the target further down. */
	minlen?: number;
}

/** Only links that should shape the rows; links that must not stretch the layout are left out by the caller. */
export interface LayoutInput {
	nodes: readonly LayoutNode[];
	links: readonly LayoutLink[];
}

export interface Placed {
	id: string;
	/** Top-left corner (react-flow convention; dagre reports centers). */
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Layout {
	nodes: Placed[];
	width: number;
	height: number;
}

/** Node height: a 26 px title bar plus a 22 px caption line (graph.css `.ck-node`). */
export const NODE_H = 50;

/** Width of the content column the inline canvas lives in (Starlight's content width at desktop size). */
const COLUMN_PX = 620;

/**
 * Node width from its label (no DOM at build time): ~7.6 px per character of the 13 px semibold title plus padding.
 * Titles ellipsize, so an underestimate can only clip, never overlap.
 */
export const nodeWidth = (label: string): number => Math.min(260, Math.max(120, Math.round(label.length * 7.6 + 40)));

/** Canvas height that shows the laid-out graph at the zoom `fitView` will pick, within sane page limits. */
export function canvasHeight(l: Pick<Layout, 'width' | 'height'>, max = 640): number {
	const zoom = Math.min(FIT_ZOOM.max, Math.max(FIT_ZOOM.min, COLUMN_PX / Math.max(1, l.width)));
	return Math.round(Math.min(max, Math.max(240, l.height * zoom + 70)));
}

function run(input: LayoutInput, constraints: OrderConstraint[]): graphlib.Graph {
	const g = new graphlib.Graph();
	g.setGraph({ rankdir: 'TB', nodesep: 32, ranksep: 64, marginx: 0, marginy: 0 });
	g.setDefaultEdgeLabel(() => ({}));
	for (const n of input.nodes) g.setNode(n.id, { width: nodeWidth(n.label), height: NODE_H });
	for (const l of input.links) g.setEdge(l.source, l.target, { minlen: l.minlen ?? 1 });
	dagreLayout(g, { constraints });
	return g;
}

/**
 * Two passes: the first finds the rows, the second pins each row's left-to-right order to course order
 * (dagre `constraints` between neighbours of a row), letting dagre place everything else.
 */
export function layout(input: LayoutInput): Layout {
	const rank = (i: number) => input.nodes[i]!.order ?? i;
	const first = run(input, []);
	const rows = new Map<number, number[]>();
	input.nodes.forEach((n, i) => {
		const y = Math.round(first.node(n.id).y);
		rows.set(y, [...(rows.get(y) ?? []), i]);
	});
	const constraints: OrderConstraint[] = [];
	for (const row of rows.values()) {
		const sorted = [...row].sort((a, b) => rank(a) - rank(b) || a - b);
		for (let k = 1; k < sorted.length; k++) {
			constraints.push({ left: input.nodes[sorted[k - 1]!]!.id, right: input.nodes[sorted[k]!]!.id });
		}
	}
	const g = run(input, constraints);
	const nodes = input.nodes.map((n) => {
		const p = g.node(n.id);
		return { id: n.id, x: p.x - p.width / 2, y: p.y - p.height / 2, w: p.width, h: p.height };
	});
	const { width = 0, height = 0 } = g.graph();
	return { nodes, width, height };
}
