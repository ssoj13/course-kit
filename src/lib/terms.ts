/** The course's term graph (terms.json via `virtual:course-kit/data`), queried with the functions in graph.ts. */
import { terms as data } from 'virtual:course-kit/data';
import { makeGraph, type TermGraph } from './graph';

export const graph: TermGraph = makeGraph(data);
