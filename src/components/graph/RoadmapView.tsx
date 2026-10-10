/**
 * roadmap.sh-style course map (React island): modules on a vertical spine, their lessons on both sides,
 * completed lessons marked from the shared progress record (lib/progress.ts, updates live). Positions are
 * computed by Roadmap.astro at build time; clicking a node opens the lesson or module page.
 */
import { useEffect, useMemo, useState } from 'react';
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './graph.css';
import { Frame } from './Frame';
import { KEYS, watch } from '../../lib/store';
import { readProgress, type Progress } from '../../lib/progress';

export interface RoadNode {
	id: string;
	kind: 'module' | 'lesson';
	label: string;
	href: string;
	/** Lesson slug (progress key); empty for modules. */
	slug: string;
	/** Lesson slugs of a module, to show "3/5" on module nodes. */
	lessons: string[];
	/** Which side of the spine a lesson sits on: its handle faces the spine. */
	side: 'left' | 'right' | 'center';
	optional: boolean;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface RoadEdge {
	from: string;
	to: string;
	spine: boolean;
}

type Data = RoadNode & { progress: Progress } & Record<string, unknown>;

function RoadNodeView({ data }: NodeProps<Node<Data>>) {
	const done = data.kind === 'lesson' ? data.progress[data.slug] === true : data.lessons.every((s) => data.progress[s] === true);
	const count = data.kind === 'module' ? data.lessons.filter((s) => data.progress[s] === true).length : 0;
	const inward = data.side === 'left' ? Position.Right : Position.Left;
	return (
		<a
			className={`ck-road ck-road-${data.kind}${done ? ' is-done' : ''}${data.optional ? ' is-optional' : ''}`}
			style={{ width: data.w, height: data.h }}
			href={data.href}
		>
			{data.kind === 'module' ? (
				<>
					<Handle type="target" position={Position.Top} isConnectable={false} />
					<Handle id="side-l" type="source" position={Position.Left} isConnectable={false} />
					<Handle id="side-r" type="source" position={Position.Right} isConnectable={false} />
					<span>{data.label}</span>
					<small>
						{count}/{data.lessons.length}
					</small>
					<Handle type="source" position={Position.Bottom} isConnectable={false} />
				</>
			) : (
				<>
					<Handle type="target" position={inward} isConnectable={false} />
					<span>{data.label}</span>
					{done && <b aria-label="completed">✓</b>}
				</>
			)}
		</a>
	);
}

const nodeTypes = { road: RoadNodeView };

export default function RoadmapView({ nodes, edges, height }: { nodes: RoadNode[]; edges: RoadEdge[]; height: number }) {
	const [progress, setProgress] = useState<Progress>({});
	useEffect(() => {
		setProgress(readProgress());
		return watch(KEYS.progress, () => setProgress(readProgress()));
	}, []);

	const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
	const rfNodes = useMemo<Node<Data>[]>(
		() =>
			nodes.map((n) => ({
				id: n.id,
				type: 'road',
				position: { x: n.x, y: n.y },
				width: n.w,
				height: n.h,
				data: { ...n, progress } as Data,
				draggable: false,
				connectable: false,
				selectable: false,
			})),
		[nodes, progress],
	);
	const rfEdges = useMemo<Edge[]>(
		() =>
			edges.map((e) => {
				const side = byId.get(e.to)?.side;
				return {
					id: `${e.from}-${e.to}`,
					source: e.from,
					target: e.to,
					sourceHandle: e.spine ? undefined : side === 'left' ? 'side-l' : 'side-r',
					type: e.spine ? 'straight' : 'smoothstep',
					className: e.spine ? 'ck-spine' : 'ck-branch',
				};
			}),
		[edges, byId],
	);

	return (
		<div className="ck-graph">
			<Frame height={height}>
				<ReactFlow
					nodes={rfNodes}
					edges={rfEdges}
					nodeTypes={nodeTypes}
					fitView
					fitViewOptions={{ padding: 0.05 }}
					minZoom={0.2}
					maxZoom={1.5}
					zoomOnScroll={false}
					panOnScroll
					preventScrolling={false}
					nodesDraggable={false}
					nodesConnectable={false}
					proOptions={{ hideAttribution: true }}
				>
					<Background gap={24} size={1} />
					<Controls showInteractive={false} />
				</ReactFlow>
			</Frame>
		</div>
	);
}
