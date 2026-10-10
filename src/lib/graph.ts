/**
 * Queries over a term graph. Every mind map, the glossary and term tooltips select their nodes here, so
 * "what is related to what" has one implementation. Pure functions over a `TermGraph` value (no virtual
 * module), so tests build their own graphs; `terms.ts` binds them to the course's graph.
 */
import { ACYCLIC_EDGE_TYPES, type EdgeJson, type EdgeType, type LayerJson, type TermJson, type TermsJson } from '../data.mjs';

export type { EdgeJson, EdgeType, LayerJson, TermJson };

/** Edge types that form hierarchies: "down to the roots" follows these (validated acyclic in data.mjs). */
export const HIERARCHY: readonly EdgeType[] = ACYCLIC_EDGE_TYPES;

export interface TermGraph {
	layers: readonly LayerJson[];
	terms: readonly TermJson[];
	edges: readonly EdgeJson[];
	byId: ReadonlyMap<string, TermJson>;
	/** Layer id -> depth index (0 = top: the most abstract layer). */
	layerIndex: ReadonlyMap<string, number>;
}

export function makeGraph(t: TermsJson): TermGraph {
	return {
		layers: t.layers,
		terms: t.terms,
		edges: t.edges,
		byId: new Map(t.terms.map((x) => [x.id, x])),
		layerIndex: new Map(t.layers.map((l, i) => [l.id, i])),
	};
}

/** A selection of the graph: what a mind map draws. */
export interface SubGraph {
	terms: TermJson[];
	edges: EdgeJson[];
}

export function term(g: TermGraph, id: string): TermJson {
	const t = g.byId.get(id);
	if (!t) throw new Error(`terms.json has no term "${id}"`);
	return t;
}

/** Terms within `hops` edges of `id` (any type, either direction) and the edges among them. */
export function neighborhood(g: TermGraph, id: string, hops: number): SubGraph {
	term(g, id);
	const seen = new Set([id]);
	let frontier = [id];
	for (let i = 0; i < hops && frontier.length; i++) {
		const next: string[] = [];
		for (const e of g.edges) {
			for (const [a, b] of [
				[e.from, e.to],
				[e.to, e.from],
			]) {
				if (frontier.includes(a) && !seen.has(b)) {
					seen.add(b);
					next.push(b);
				}
			}
		}
		frontier = next;
	}
	return induced(g, seen);
}

/**
 * Genealogy: `id` and everything it is (transitively) built on / a kind of / part of, down to the roots.
 * Answers "what do I need to understand first".
 */
export function ancestors(g: TermGraph, id: string, types: readonly EdgeType[] = HIERARCHY): SubGraph {
	return closure(g, id, types, 'down');
}

/** Everything (transitively) built on `id`: answers "what does this unlock". */
export function descendants(g: TermGraph, id: string, types: readonly EdgeType[] = HIERARCHY): SubGraph {
	return closure(g, id, types, 'up');
}

/** Terms introduced by a lesson plus their direct neighbors: the lesson's local mind map. */
export function lessonMap(g: TermGraph, lesson: string): SubGraph {
	const own = new Set(g.terms.filter((t) => t.lesson === lesson).map((t) => t.id));
	if (!own.size) throw new Error(`terms.json: no term has "lesson": "${lesson}"`);
	// Test against `own`, not the growing set: otherwise neighbors added earlier pull in their own neighbors.
	const ids = new Set(own);
	for (const e of g.edges) {
		if (own.has(e.from) || own.has(e.to)) {
			ids.add(e.from);
			ids.add(e.to);
		}
	}
	return induced(g, ids);
}

/** The whole graph. */
export function everything(g: TermGraph): SubGraph {
	return { terms: [...g.terms], edges: [...g.edges] };
}

/** Terms sorted for the glossary: by label in the alphabet of `lang`, case-insensitive. */
export function sortedTerms(g: TermGraph, lang: string): TermJson[] {
	return [...g.terms].sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: 'base' }));
}

/** Direct hierarchy parents of a term ("built on" these), for glossary entries and tooltips. */
export function parents(g: TermGraph, id: string): { edge: EdgeJson; term: TermJson }[] {
	return g.edges.filter((e) => e.from === id && HIERARCHY.includes(e.type)).map((edge) => ({ edge, term: term(g, edge.to) }));
}

function closure(g: TermGraph, id: string, types: readonly EdgeType[], dir: 'down' | 'up'): SubGraph {
	term(g, id);
	const seen = new Set([id]);
	const stack = [id];
	while (stack.length) {
		const cur = stack.pop()!;
		for (const e of g.edges) {
			if (!types.includes(e.type)) continue;
			const [a, b] = dir === 'down' ? [e.from, e.to] : [e.to, e.from];
			if (a === cur && !seen.has(b)) {
				seen.add(b);
				stack.push(b);
			}
		}
	}
	const sub = induced(g, seen);
	return { terms: sub.terms, edges: sub.edges.filter((e) => types.includes(e.type)) };
}

/** Terms of `ids` (in graph order, so output is deterministic) and every edge with both ends inside. */
function induced(g: TermGraph, ids: ReadonlySet<string>): SubGraph {
	return {
		terms: g.terms.filter((t) => ids.has(t.id)),
		edges: g.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
	};
}
