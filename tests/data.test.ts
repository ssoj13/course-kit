import { describe, expect, test } from 'bun:test';
import { checkCourse, checkTerms, findCycle } from '../src/data.mjs';
import { makeResolver } from '../src/links.mjs';
import { ancestors, descendants, lessonMap, makeGraph, neighborhood, parents } from '../src/lib/graph';

const course = {
	id: 'demo',
	title: 'Demo',
	description: 'Demo course.',
	modules: [
		{
			slug: 'm1',
			title: 'One',
			summary: 'First.',
			lessons: [
				{ slug: 'a', title: 'A', summary: 'a' },
				{ slug: 'b', title: 'B', summary: 'b' },
			],
		},
	],
};

const terms = {
	layers: [
		{ id: 'top', label: 'Top' },
		{ id: 'hw', label: 'Hardware' },
	],
	terms: [
		{ id: 'x', label: 'X', layer: 'top', def: 'x', lesson: 'a' },
		{ id: 'y', label: 'Y', layer: 'top', def: 'y', lesson: 'b' },
		{ id: 'z', label: 'Z', layer: 'hw', def: 'z' },
		{ id: 'w', label: 'W', layer: 'top', def: 'w' },
	],
	edges: [
		{ from: 'x', to: 'z', type: 'built-on' },
		{ from: 'y', to: 'x', type: 'is-a' },
		{ from: 'w', to: 'y', type: 'related' },
	],
};

const clone = <T>(v: T): T => structuredClone(v);

describe('checkCourse', () => {
	test('accepts a valid manifest', () => {
		expect(checkCourse(clone(course)).id).toBe('demo');
	});
	test('reports every problem at once', () => {
		const bad = clone(course) as any;
		bad.id = 'Bad Id';
		bad.modules[0].lessons[1].slug = 'a';
		bad.modules.push({ slug: 'roadmap', title: 'R', summary: 'r', lessons: [] });
		expect(() => checkCourse(bad)).toThrow(/id.*\n.*duplicate lesson slug.*\n.*reserved.*\n.*at least one lesson/s);
	});
});

describe('checkTerms', () => {
	const c = checkCourse(clone(course));
	test('accepts a valid graph', () => {
		expect(checkTerms(clone(terms), c).terms).toHaveLength(4);
	});
	test('rejects unknown refs, layers and lessons', () => {
		const bad = clone(terms) as any;
		bad.terms[0].layer = 'nope';
		bad.terms[1].lesson = 'nope';
		bad.edges.push({ from: 'x', to: 'ghost', type: 'built-on' });
		expect(() => checkTerms(bad, c)).toThrow(/unknown layer[\s\S]*unknown lesson[\s\S]*unknown term "ghost"/);
	});
	test('rejects a cycle that only exists across hierarchy types', () => {
		const bad = clone(terms) as any;
		bad.edges.push({ from: 'z', to: 'y', type: 'part-of' }); // x -built-on-> z -part-of-> y -is-a-> x
		expect(() => checkTerms(bad, c)).toThrow(/form a cycle/);
	});
	test('non-hierarchy edges may form cycles', () => {
		const ok = clone(terms) as any;
		ok.edges.push({ from: 'y', to: 'w', type: 'related' });
		expect(() => checkTerms(ok, c)).not.toThrow();
	});
});

describe('findCycle', () => {
	test('returns a closed path', () => {
		expect(findCycle([{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }])).toEqual(['a', 'b', 'c', 'a']);
	});
	test('null for a DAG', () => {
		expect(findCycle([{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'c' }])).toBeNull();
	});
});

describe('links', () => {
	const c = checkCourse(clone(course));
	const t = checkTerms(clone(terms), c);
	const resolve = makeResolver(c, t, { extra: 'labs/extra' }, '/base/');
	test('lesson, page and term links', () => {
		expect(resolve('lesson:b#sec')).toBe('/base/m1/b/#sec');
		expect(resolve('page:home')).toBe('/base/');
		expect(resolve('page:extra')).toBe('/base/labs/extra/');
		expect(resolve('term:z')).toBe('/base/glossary/#term-z');
	});
	test('other URLs are left alone', () => {
		expect(resolve('https://example.com')).toBeNull();
		expect(resolve('#local')).toBeNull();
	});
	test('unknown targets fail with the file name', () => {
		expect(() => resolve('lesson:nope', 'x.mdx')).toThrow(/x\.mdx: unknown course link "lesson:nope"/);
		expect(() => resolve('term:nope', 'x.mdx')).toThrow(/x\.mdx: unknown term "nope"/);
	});
});

describe('graph queries', () => {
	const g = makeGraph(checkTerms(clone(terms), checkCourse(clone(course))));
	const ids = (s: { terms: { id: string }[] }) => s.terms.map((t) => t.id).sort();
	test('ancestors follow hierarchy edges down to the roots', () => {
		expect(ids(ancestors(g, 'y'))).toEqual(['x', 'y', 'z']);
	});
	test('descendants follow them up', () => {
		expect(ids(descendants(g, 'z'))).toEqual(['x', 'y', 'z']);
	});
	test('neighborhood uses every edge type in both directions', () => {
		expect(ids(neighborhood(g, 'y', 1))).toEqual(['w', 'x', 'y']);
		expect(ids(neighborhood(g, 'y', 2))).toEqual(['w', 'x', 'y', 'z']);
	});
	test('lesson map = lesson terms + direct neighbors', () => {
		expect(ids(lessonMap(g, 'a'))).toEqual(['x', 'y', 'z']);
	});
	test('parents are the direct hierarchy targets', () => {
		expect(parents(g, 'y').map((p) => p.term.id)).toEqual(['x']);
	});
});
