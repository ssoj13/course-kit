import { describe, expect, test } from 'bun:test';
import { anchor, clampRect, makeForest, openAll, pickParents, placeWindow, reveal, shown, spine, tidy } from '../src/lib/tree';

// root -> a (g2), b (g1); a -> a1, a2; b -> b1
const nodes = [
	{ id: 'root' },
	{ id: 'a', parent: 'root', group: 'g2' },
	{ id: 'b', parent: 'root', group: 'g1' },
	{ id: 'a1', parent: 'a' },
	{ id: 'a2', parent: 'a' },
	{ id: 'b1', parent: 'b' },
	{ id: 'lone', parent: 'not-in-map' },
];
const f = makeForest(nodes, ['g1', 'g2']);

describe('forest', () => {
	test('roots, children sorted by group order, unknown parent = root', () => {
		expect(f.roots).toEqual(['root', 'lone']);
		expect(f.kids.get('root')).toEqual(['b', 'a']);
		expect(f.kids.get('a')).toEqual(['a1', 'a2']);
	});
	test('cycles and duplicates are errors', () => {
		expect(() => makeForest([{ id: 'x', parent: 'y' }, { id: 'y', parent: 'x' }])).toThrow(/cycle/);
		expect(() => makeForest([{ id: 'x' }, { id: 'x' }])).toThrow(/duplicate/);
	});
	test('visible rows follow the open set', () => {
		expect([...shown(f, new Set(['root']))]).toEqual([
			['root', 0],
			['b', 1],
			['a', 1],
			['lone', 0],
		]);
		expect(shown(f, openAll(f)).size).toBe(nodes.length);
		expect(openAll(f)).toEqual(new Set(['root', 'a', 'b']));
	});
	test('reveal opens the ancestors of the given nodes and the roots', () => {
		expect(reveal(f, ['a2'])).toEqual(new Set(['root', 'a']));
		expect(shown(f, reveal(f, ['a2'])).has('a2')).toBe(true);
	});
	test('a hidden node folds into its closest visible ancestor', () => {
		const vis = shown(f, new Set(['root']));
		expect(anchor(f, vis, 'a1')).toBe('a');
		expect(anchor(f, vis, 'b')).toBe('b');
	});
});

describe('primary parents', () => {
	test('best priority wins, a cycle-closing candidate becomes an extra parent', () => {
		// x built-on y (0); y uses x (3) would close a cycle; z related x (4)
		const c = new Map([
			['x', [{ to: 'y', prio: 0 }]],
			['y', [{ to: 'x', prio: 3 }]],
			['z', [{ to: 'x', prio: 4 }, { to: 'y', prio: 0 }]],
		]);
		const { parent, extra } = pickParents(['x', 'y', 'z'], c);
		expect(parent).toEqual(new Map([['x', 'y'], ['y', null], ['z', 'y']]));
		expect(extra.get('y')).toEqual(['x']);
		expect(extra.get('z')).toEqual(['x']);
		expect(() => makeForest([...parent].map(([id, p]) => ({ id, parent: p })))).not.toThrow();
	});
	test('candidates outside the map are ignored', () => {
		const { parent, extra } = pickParents(['x'], new Map([['x', [{ to: 'gone', prio: 0 }]]]));
		expect(parent.get('x')).toBeNull();
		expect(extra.get('x')).toEqual([]);
	});
});

describe('spine', () => {
	// instance -> msg (same group), phys (devices) -> dev -> queue, img (images), view (pres), pool (desc) -> set
	const objs = [
		{ id: 'instance', group: 'inst' },
		{ id: 'msg', parent: 'instance', group: 'inst' },
		{ id: 'phys', parent: 'instance', group: 'dev' },
		{ id: 'dev', parent: 'phys', group: 'dev' },
		{ id: 'queue', parent: 'dev', group: 'dev' },
		{ id: 'img', parent: 'dev', group: 'img' },
		{ id: 'pool', parent: 'dev', group: 'desc' },
		{ id: 'set', parent: 'pool', group: 'desc' },
		{ id: 'layout', parent: 'dev', group: 'desc' },
		{ id: 'root', group: 'none' },
	];
	const order = ['inst', 'dev', 'img', 'desc'];
	const g = new Map(objs.map((o) => [o.id, o.group]));
	const sp = spine(makeForest(objs, order), (id) => g.get(id)!, order);
	test('spine nodes start at every group change, sections follow the group order, ungrouped first', () => {
		expect(sp.map((s) => [s.group, s.heads.map((h) => h.id)])).toEqual([
			['none', ['root']],
			['inst', ['instance']],
			['dev', ['phys']],
			['img', ['img']],
			['desc', ['pool', 'layout']],
		]);
	});
	test('same-group descendants branch off with their depth, sides alternate', () => {
		const h = (id: string) => sp.flatMap((s) => s.heads).find((x) => x.id === id)!;
		expect(h('instance')).toEqual({ id: 'instance', left: [], right: [{ id: 'msg', depth: 1 }] });
		expect(h('phys')).toEqual({ id: 'phys', left: [{ id: 'dev', depth: 1 }, { id: 'queue', depth: 2 }], right: [] });
		expect(h('pool').right).toEqual([{ id: 'set', depth: 1 }]);
		expect(h('layout')).toEqual({ id: 'layout', left: [], right: [] });
	});
	test('inside a group, shallower spine nodes come first (surface before swapchain)', () => {
		const o = [
			{ id: 'inst', group: 'a' },
			{ id: 'phys', parent: 'inst', group: 'b' },
			{ id: 'dev', parent: 'phys', group: 'b' },
			{ id: 'swap', parent: 'dev', group: 'c' },
			{ id: 'surf', parent: 'inst', group: 'c' },
		];
		const gg = new Map(o.map((x) => [x.id, x.group]));
		const s = spine(makeForest(o, ['a', 'b', 'c']), (id) => gg.get(id)!, ['a', 'b', 'c']);
		expect(s.at(-1)!.heads.map((h) => h.id)).toEqual(['surf', 'swap']);
	});
	test('a big block with several branches is split between the sides', () => {
		const f2 = makeForest([{ id: 'r' }, ...['a', 'b', 'c', 'd'].map((id) => ({ id, parent: 'r' }))]);
		const [s] = spine(f2, () => 'x', ['x']);
		expect(s!.heads[0]!.right.map((r) => r.id)).toEqual(['a', 'c']);
		expect(s!.heads[0]!.left.map((r) => r.id)).toEqual(['b', 'd']);
	});
});

describe('details window placement', () => {
	const min = { w: 300, h: 200 };
	test('opens at the right side, clamped into the viewport', () => {
		expect(placeWindow(1440, 900, { w: 560, h: 630 }, null, null, min)).toEqual({ x: 1440 - 560 - 24, y: 108, w: 560, h: 630 });
		expect(clampRect({ x: -50, y: 2000, w: 5000, h: 100 }, 800, 600, min)).toEqual({ x: 12, y: 600 - 200 - 12, w: 776, h: 200 });
	});
	test('moves off the node it describes', () => {
		const node = { x: 1000, y: 300, w: 120, h: 30 };
		const r = placeWindow(1440, 900, { w: 560, h: 630 }, node, null, min);
		expect(r.x + r.w <= node.x || r.x >= node.x + node.w).toBe(true);
	});
	test('a saved place wins when it does not cover the node', () => {
		const saved = { x: 40, y: 40, w: 400, h: 300 };
		expect(placeWindow(1440, 900, { w: 560, h: 630 }, { x: 900, y: 500, w: 100, h: 30 }, saved, min)).toEqual(saved);
	});
});

describe('tidy layout', () => {
	const size = (id: string) => ({ w: id.length * 10, h: id === 'a' ? 100 : 20 });
	const opt = { gap: () => 30, gapY: 10, treeGap: 16 };
	test('columns from the widest card, leaves stacked, parents centered', () => {
		const { pos, width, height } = tidy(f, openAll(f), size, opt);
		// columns: depth 0 widest 'root'/'lone' = 40; depth 1 = 10; depth 2 = 20
		expect(pos.get('root')!.x).toBe(0);
		expect(pos.get('a')!.x).toBe(70);
		expect(pos.get('a1')!.x).toBe(110);
		// b1 at 0, b centered on it; a1 at 30, a2 at 60; a (h 100) cannot go above its subtree top (30)
		expect(pos.get('b1')!.y).toBe(0);
		expect(pos.get('b')!.y).toBe(0);
		expect(pos.get('a1')!.y).toBe(30);
		expect(pos.get('a')!.y).toBe(30);
		// rows after a tall parent start below it; the next tree adds treeGap
		expect(pos.get('lone')!.y).toBeGreaterThanOrEqual(30 + 100 + 10 + 16);
		expect(width).toBe(130);
		expect(height).toBe(pos.get('lone')!.y + 20);
	});
	test('collapsed nodes are not placed', () => {
		const { pos } = tidy(f, new Set(['root']), size, opt);
		expect(pos.has('a1')).toBe(false);
		expect(pos.get('b')!.y).toBe(0);
		expect(pos.get('a')!.y).toBe(30);
	});
	test('no two visible cards of one column overlap', () => {
		const { pos } = tidy(f, openAll(f), size, opt);
		const list = [...pos].map(([id, p]) => ({ ...p, h: size(id).h }));
		for (const p of list)
			for (const q of list) if (p !== q && p.x === q.x) expect(p.y + p.h <= q.y || q.y + q.h <= p.y).toBe(true);
	});
});
