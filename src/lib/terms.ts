/** The course's term graph per language (terms.json + overlays via `virtual:course-kit/data`), queried with graph.ts. */
import { terms } from 'virtual:course-kit/data';
import { makeGraph, type TermGraph } from './graph';

const graphs = new Map(Object.entries(terms).map(([lang, t]) => [lang, makeGraph(t)]));

/** The term graph in a language (same ids and edges in every language, translated labels and definitions). */
export function graphIn(lang: string): TermGraph {
	const g = graphs.get(lang);
	if (!g) throw new Error(`terms.json has no language "${lang}"`);
	return g;
}
