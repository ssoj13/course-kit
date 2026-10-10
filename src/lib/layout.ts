/**
 * Build-time layered graph layout with dagre (Sugiyama-style ranks, the layout react-flow's own examples use).
 * Mind maps are laid out while the page is generated, so the browser receives fixed positions.
 *
 * Direction: hierarchy edges point from a term to what it is built on, ranked top -> bottom, so foundations
 * (and the hardware layer) end up at the bottom - the same reading order as a "depth stack".
 *
 * Why not ELK: elkjs decides at load time whether it runs inside a Web Worker by testing
 * `typeof document === 'undefined' && typeof self !== 'undefined'`; Bun defines `self`, so under Bun elkjs
 * exports nothing and `new ELK()` throws.
 */
import { graphlib, layout as dagreLayout } from '@dagrejs/dagre';
import { HIERARCHY, type EdgeType } from './graph';

/** What the layout needs: any node/edge set (term subgraphs, but also course-specific graphs such as object trees). */
export interface LayoutInput {
	terms: readonly { id: string; label: string }[];
	edges: readonly { from: string; to: string; type: EdgeType }[];
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

const NODE_H = 40;

/**
 * Node width from its label (no DOM at build time): ~7.5 px per character at the node font size plus padding.
 * The node component uses the same font and ellipsizes, so an underestimate can only clip, never overlap.
 */
export const nodeWidth = (label: string): number => Math.min(240, Math.max(96, Math.round(label.length * 7.5 + 32)));

export function layout(sub: LayoutInput): Layout {
	const g = new graphlib.Graph();
	g.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: 56, marginx: 0, marginy: 0 });
	g.setDefaultEdgeLabel(() => ({}));
	for (const t of sub.terms) g.setNode(t.id, { width: nodeWidth(t.label), height: NODE_H });
	// Hierarchy edges drive the ranks; the others are drawn but must not stretch the layers.
	for (const e of sub.edges) if (HIERARCHY.includes(e.type)) g.setEdge(e.from, e.to);
	dagreLayout(g);
	const nodes = sub.terms.map((t) => {
		const n = g.node(t.id);
		return { id: t.id, x: n.x - n.width / 2, y: n.y - n.height / 2, w: n.width, h: n.height };
	});
	const { width = 0, height = 0 } = g.graph();
	return { nodes, width, height };
}
