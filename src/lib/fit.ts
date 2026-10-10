/**
 * Zoom range for fitting a graph into its canvas, shared by the build-time height estimate (layout.ts) and every
 * graph island: below `min` node labels get unreadable (the rest of a wide graph is reached by panning or full
 * screen), above `max` small maps look bloated. A separate module so islands do not pull the layout code (dagre).
 */
export const FIT_ZOOM = { min: 0.75, max: 1.2 } as const;
