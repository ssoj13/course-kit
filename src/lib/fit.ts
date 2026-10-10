/**
 * Zoom range for fitting a graph into its canvas, shared by the build-time height estimate (layout.ts) and every
 * graph island: below `min` node labels get unreadable (the rest of a wide graph is reached by panning or full
 * screen), above `max` small maps look bloated. A separate module so islands do not pull the layout code (dagre).
 */
import type { Edge, Node, ReactFlowInstance } from '@xyflow/react';

export const FIT_ZOOM = { min: 0.75, max: 1.2 } as const;

/**
 * `onInit` handler: graphs read top to bottom (roots first), so when the clamped zoom cannot show the whole graph,
 * keep the horizontal centering of `fitView` but move the top of the graph into view instead of its middle.
 * Runs on the next frame, after react-flow has applied `fitView`.
 */
export function alignTop<N extends Node, E extends Edge>(rf: ReactFlowInstance<N, E>): void {
	requestAnimationFrame(() => {
		const { x, zoom } = rf.getViewport();
		const minY = Math.min(...rf.getNodes().map((n) => n.position.y));
		if (Number.isFinite(minY)) rf.setViewport({ x, y: 24 - minY * zoom, zoom });
	});
}
