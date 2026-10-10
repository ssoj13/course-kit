/**
 * Zoom range for fitting a graph into its canvas, shared by the build-time height estimate (layout.ts) and every
 * graph island: below `min` node labels get unreadable (the rest of a wide graph is reached by panning or full
 * screen), above `max` small maps look bloated. A separate module so islands do not pull the layout code (dagre).
 */
import type { Edge, Node, ReactFlowInstance } from '@xyflow/react';

export const FIT_ZOOM = { min: 0.75, max: 1.2 } as const;

/** Gap kept above the top of a graph that does not fit vertically, in screen px. */
const TOP_GAP = 24;

/**
 * `onInit` handler: graphs read from their root (the top), so when the clamped zoom cannot show all of a graph,
 * start at the root instead of the middle: a too-tall graph shows its top edge, a too-wide one is centered on its
 * top-most node. A graph that fits keeps `fitView`'s centering.
 *
 * The canvas size is derived from `fitView`'s result (it puts the center of the graph bounds at the center of the
 * canvas), so no DOM measuring is needed. Runs on the next frame, after `fitView` has been applied.
 */
export function alignTop<N extends Node, E extends Edge>(rf: ReactFlowInstance<N, E>): void {
	requestAnimationFrame(() => {
		const nodes = rf.getNodes();
		if (!nodes.length) return;
		const b = rf.getNodesBounds(nodes);
		const { x, y, zoom } = rf.getViewport();
		const w = 2 * (x + (b.x + b.width / 2) * zoom);
		const h = 2 * (y + (b.y + b.height / 2) * zoom);
		const top = nodes.reduce((a, n) => (n.position.y < a.position.y ? n : a));
		const topCx = top.position.x + (top.width ?? top.measured?.width ?? 0) / 2;
		rf.setViewport({
			x: b.width * zoom > w ? w / 2 - topCx * zoom : x,
			y: b.height * zoom > h ? TOP_GAP - b.y * zoom : y,
			zoom,
		});
	});
}
