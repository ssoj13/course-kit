/**
 * State shared by every graph island: draggable nodes that start at the build-time layout, keep where the reader
 * dragged them when the node data changes (selection, progress, simulator state), and go back on reset.
 */
import { useCallback, useEffect } from 'react';
import { useNodesState, type Edge, type Node } from '@xyflow/react';

/**
 * `initial` must be memoized by the caller: a new array means new data (positions of dragged nodes are kept);
 * `reset` restores the layout positions.
 */
export function useFlowNodes<N extends Node>(initial: N[]) {
	const [nodes, setNodes, onNodesChange] = useNodesState<N>(initial);
	useEffect(() => {
		setNodes((cur) => {
			const moved = new Map(cur.map((n) => [n.id, n.position]));
			return initial.map((n) => ({ ...n, position: moved.get(n.id) ?? n.position }));
		});
	}, [initial, setNodes]);
	const reset = useCallback(() => setNodes(initial), [initial, setNodes]);
	return { nodes, onNodesChange, reset };
}

/** Adds `is-hot` to the edges that touch the selected node, so its wires stand out. */
export function heat(edges: Edge[], selected: string | null): Edge[] {
	if (!selected) return edges;
	return edges.map((e) =>
		e.source === selected || e.target === selected ? { ...e, className: `${e.className ?? ''} is-hot`, zIndex: 1 } : e,
	);
}
