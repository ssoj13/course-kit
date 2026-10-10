/**
 * roadmap.sh-style course map (React island): modules on a vertical spine (top to bottom = course order), their
 * lessons on both sides (left first), completed lessons marked from the shared progress record (lib/progress.ts,
 * updates live). Positions are computed by Roadmap.astro at build time; nodes can be dragged; clicking a node opens
 * the lesson or module page.
 */
import { useEffect, useMemo, useState } from 'react';
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './graph.css';
import { Frame } from './Frame';
import { useFlowNodes } from './flow';
import { FIT_ZOOM, alignTop } from '../../lib/fit';
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
	return (
		<a
			className={`ck-road ck-road-${data.kind}${done ? ' is-done' : ''}${data.optional ? ' is-optional' : ''}`}
			style={{ width: data.w, height: data.h }}
			href={data.href}
			draggable={false}
		>
			{data.kind === 'module' ? (
				<>
					{/* Tree geometry: the module spine runs down the left edge, lesson branches leave just right of it. */}
					<Handle id="in" type="target" position={Position.Top} style={{ left: 14 }} isConnectable={false} />
					<span className="ck-road-row">
						<span>{data.label}</span>
						<small>
							{count}/{data.lessons.length}
						</small>
					</span>
					<Handle id="spine" type="source" position={Position.Bottom} style={{ left: 14 }} isConnectable={false} />
					<Handle id="tree" type="source" position={Position.Bottom} style={{ left: 30 }} isConnectable={false} />
				</>
			) : (
				<>
					<Handle type="target" position={Position.Left} isConnectable={false} />
					<span className="ck-road-row">
						<span>{data.label}</span>
						{done && <b aria-label="completed">✓</b>}
					</span>
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

	const initial = useMemo<Node<Data>[]>(
		() =>
			nodes.map((n) => ({
				id: n.id,
				type: 'road',
				position: { x: n.x, y: n.y },
				width: n.w,
				height: n.h,
				data: { ...n, progress } as Data,
				connectable: false,
				selectable: false,
			})),
		[nodes, progress],
	);
	const { nodes: rfNodes, onNodesChange, reset } = useFlowNodes(initial);
	const rfEdges = useMemo<Edge[]>(
		() =>
			edges.map((e) => ({
				id: `${e.from}-${e.to}`,
				source: e.from,
				target: e.to,
				sourceHandle: e.spine ? 'spine' : 'tree',
				targetHandle: e.spine ? 'in' : undefined,
				type: 'default',
				className: e.spine ? 'ck-spine' : 'ck-branch',
			})),
		[edges],
	);

	return (
		<div className="ck-graph">
			<Frame height={height} onReset={reset}>
				<ReactFlow
					nodes={rfNodes}
					edges={rfEdges}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					fitView
					fitViewOptions={{ padding: 0.05, minZoom: FIT_ZOOM.min, maxZoom: FIT_ZOOM.max }}
					onInit={alignTop}
					minZoom={0.2}
					maxZoom={1.5}
					zoomOnScroll={false}
					panOnScroll
					preventScrolling={false}
					nodesConnectable={false}
					proOptions={{ hideAttribution: true }}
				>
					<Background gap={22} size={1.2} />
					<Controls showInteractive={false} />
				</ReactFlow>
			</Frame>
		</div>
	);
}
