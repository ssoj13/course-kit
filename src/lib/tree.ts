/**
 * Pure model of the collapsible concept tree (graph/TreeView.tsx): a forest built from "primary parent" links, the
 * set of rows a reader currently sees (from the set of open nodes), and a left-to-right tidy layout from measured
 * card sizes. Graphs that are not trees (a term built on two terms, a descriptor set made from a pool AND a layout)
 * keep one primary parent here; the other parents are drawn by the view as dashed wires or "+ from X" notes.
 * No DOM, no React: tested with `bun test` (tests/tree.test.ts).
 */

export interface Forest {
	/** Nodes without a parent inside the forest, in input order. */
	roots: readonly string[];
	/** Children per node, sorted by group order (input order inside a group). */
	kids: ReadonlyMap<string, readonly string[]>;
	parent: ReadonlyMap<string, string | null>;
}

/**
 * Builds the forest. A parent that is not one of the nodes makes the node a root (a map shows a slice of a bigger
 * graph); children are sorted by the position of their group in `groupOrder`, stably. Throws on a parent cycle.
 */
export function makeForest(nodes: readonly { id: string; parent?: string | null; group?: string }[], groupOrder: readonly string[] = []): Forest {
	const ids = new Set(nodes.map((n) => n.id));
	if (ids.size !== nodes.length) throw new Error('tree: duplicate node id');
	const rank = (g?: string) => {
		const i = g === undefined ? -1 : groupOrder.indexOf(g);
		return i < 0 ? groupOrder.length : i;
	};
	const parent = new Map<string, string | null>();
	for (const n of nodes) parent.set(n.id, n.parent && ids.has(n.parent) ? n.parent : null);
	for (const n of nodes) {
		const seen = new Set<string>();
		for (let cur: string | null = n.id; cur; cur = parent.get(cur) ?? null) {
			if (seen.has(cur)) throw new Error(`tree: parent cycle through "${cur}"`);
			seen.add(cur);
		}
	}
	const kids = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
	const order = new Map(nodes.map((n, i) => [n.id, i]));
	const groupOf = new Map(nodes.map((n) => [n.id, n.group]));
	for (const n of nodes) {
		const p = parent.get(n.id);
		if (p) kids.get(p)!.push(n.id);
	}
	for (const list of kids.values()) list.sort((a, b) => rank(groupOf.get(a)) - rank(groupOf.get(b)) || order.get(a)! - order.get(b)!);
	return { roots: nodes.filter((n) => !parent.get(n.id)).map((n) => n.id), kids, parent };
}

/** A candidate parent of a node: the node `to` it relates to, and the relation's sort priority (lower wins). */
export interface Candidate {
	to: string;
	prio: number;
}

/**
 * Chooses one primary parent per node from its candidates (best priority first, input order on ties) so that the
 * result is a forest: a candidate that would close a cycle is skipped. Graph relations such as "uses" or "related"
 * are not acyclic, so a plain "best candidate" pick could loop. Returns node -> parent (null = root) and node ->
 * the candidates that were not chosen (the view draws them as extra parents).
 */
export function pickParents(ids: readonly string[], cands: ReadonlyMap<string, readonly Candidate[]>) {
	const known = new Set(ids);
	const parent = new Map<string, string | null>(ids.map((id) => [id, null]));
	const extra = new Map<string, string[]>(ids.map((id) => [id, []]));
	const reaches = (from: string, target: string) => {
		for (let cur: string | null = from; cur; cur = parent.get(cur) ?? null) if (cur === target) return true;
		return false;
	};
	// Strongest relations first across the whole graph, so a weak link never blocks a strong one by closing a cycle.
	const all = ids.flatMap((id) => (cands.get(id) ?? []).filter((c) => known.has(c.to) && c.to !== id).map((c, i) => ({ id, c, i })));
	all.sort((a, b) => a.c.prio - b.c.prio || ids.indexOf(a.id) - ids.indexOf(b.id) || a.i - b.i);
	for (const { id, c } of all) {
		if (parent.get(id) === null && !reaches(c.to, id)) parent.set(id, c.to);
		else extra.get(id)!.push(c.to);
	}
	return { parent, extra };
}

/** Rows the reader sees: preorder (id -> depth) from every root, entering only open nodes' children. */
export function shown(f: Forest, open: ReadonlySet<string>): Map<string, number> {
	const out = new Map<string, number>();
	const walk = (id: string, d: number) => {
		out.set(id, d);
		if (open.has(id)) for (const k of f.kids.get(id) ?? []) walk(k, d + 1);
	};
	for (const r of f.roots) walk(r, 0);
	return out;
}

/** Every node with children: "expand all". */
export function openAll(f: Forest): Set<string> {
	return new Set([...f.kids].filter(([, k]) => k.length).map(([id]) => id));
}

/** The open set that makes every node of `ids` visible (all their ancestors open), plus every root. */
export function reveal(f: Forest, ids: Iterable<string>): Set<string> {
	const open = new Set(f.roots.filter((r) => f.kids.get(r)?.length));
	for (const id of ids) for (let p = f.parent.get(id) ?? null; p; p = f.parent.get(p) ?? null) open.add(p);
	return open;
}

/** The closest visible node at or above `id` (where a hidden node folds into). */
export function anchor(f: Forest, vis: ReadonlyMap<string, number>, id: string): string | null {
	for (let cur: string | null = id; cur; cur = f.parent.get(cur) ?? null) if (vis.has(cur)) return cur;
	return null;
}

/** One row of a spine block: a node and its depth below the spine node (1 = direct child). */
export interface SpineRow {
	id: string;
	depth: number;
}

/** A node on the spine with the rows that branch off it, already split into the two sides. */
export interface SpineHead {
	id: string;
	left: SpineRow[];
	right: SpineRow[];
}

/** Consecutive spine nodes of one group: the spine shows the group's name above them. */
export interface SpineSection {
	group: string;
	heads: SpineHead[];
}

/**
 * roadmap.sh-style "spine" arrangement. A spine node is a node whose primary parent is absent or of another group;
 * the descendants of the same group branch off it (preorder rows with their depth), so every group change starts a
 * new spine node. Spine nodes are ordered by group (`groupOrder`; groups not in it, such as a map's root, come
 * first), then by depth (a surface made from the instance before a swapchain made from the device), then preorder. Sides: a block of `split` or more rows made of several branches is
 * split between left and right (balanced by rows); smaller blocks alternate sides.
 */
export function spine(f: Forest, groupOf: (id: string) => string, groupOrder: readonly string[], split = 4): SpineSection[] {
	const rank = (g: string) => groupOrder.indexOf(g);
	const heads: { id: string; pre: number; depth: number; branches: SpineRow[][] }[] = [];
	let pre = 0;
	const walk = (id: string, depth: number) => {
		const p = f.parent.get(id) ?? null;
		if (!p || groupOf(p) !== groupOf(id)) {
			const branches: SpineRow[][] = [];
			for (const k of f.kids.get(id) ?? []) {
				if (groupOf(k) !== groupOf(id)) continue;
				const rows: SpineRow[] = [];
				const side = (n: string, d: number) => {
					rows.push({ id: n, depth: d });
					for (const c of f.kids.get(n) ?? []) if (groupOf(c) === groupOf(id)) side(c, d + 1);
				};
				side(k, 1);
				branches.push(rows);
			}
			heads.push({ id, pre: pre++, depth, branches });
		}
		for (const k of f.kids.get(id) ?? []) walk(k, depth + 1);
	};
	f.roots.forEach((r) => walk(r, 0));
	heads.sort((a, b) => rank(groupOf(a.id)) - rank(groupOf(b.id)) || a.depth - b.depth || a.pre - b.pre);
	const out: SpineSection[] = [];
	let nextLeft = false;
	for (const h of heads) {
		const g = groupOf(h.id);
		if (out.at(-1)?.group !== g) out.push({ group: g, heads: [] });
		const rows = h.branches.flat().length;
		const head: SpineHead = { id: h.id, left: [], right: [] };
		if (rows >= split && h.branches.length > 1) {
			// Fill the smaller side with the next branch, in order.
			for (const b of h.branches) (head.right.length <= head.left.length ? head.right : head.left).push(...b);
		} else if (rows) {
			(nextLeft ? head.left : head.right).push(...h.branches.flat());
			nextLeft = !nextLeft;
		}
		out.at(-1)!.heads.push(head);
	}
	return out;
}

/** A rectangle in viewport pixels. */
export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Margin kept between a floating window and the viewport edges. */
const EDGE = 12;

/** Keeps a window inside the viewport: never larger than it, never past an edge. */
export function clampRect(r: Rect, vw: number, vh: number, min: { w: number; h: number }): Rect {
	const w = Math.max(Math.min(r.w, vw - 2 * EDGE), Math.min(min.w, vw - 2 * EDGE));
	const h = Math.max(Math.min(r.h, vh - 2 * EDGE), Math.min(min.h, vh - 2 * EDGE));
	return { w, h, x: Math.min(Math.max(r.x, EDGE), vw - w - EDGE), y: Math.min(Math.max(r.y, EDGE), vh - h - EDGE) };
}

/**
 * Where a details window opens: the reader's last place (`saved`) if any, else at the right side of the viewport;
 * when it would cover the node it describes (`avoid`), it moves to the side of the viewport away from the node.
 */
export function placeWindow(vw: number, vh: number, size: { w: number; h: number }, avoid: Rect | null, saved: Rect | null, min: { w: number; h: number }): Rect {
	const r = clampRect(saved ?? { x: vw - size.w - 2 * EDGE, y: Math.max(EDGE, vh * 0.12), ...size }, vw, vh, min);
	if (!avoid) return r;
	const hits = (q: Rect) => q.x < avoid.x + avoid.w && avoid.x < q.x + q.w && q.y < avoid.y + avoid.h && avoid.y < q.y + q.h;
	if (!hits(r)) return r;
	const right = clampRect({ ...r, x: avoid.x + avoid.w + EDGE }, vw, vh, min);
	if (!hits(right)) return right;
	const left = clampRect({ ...r, x: avoid.x - r.w - EDGE }, vw, vh, min);
	return hits(left) ? r : left;
}

export interface Size {
	w: number;
	h: number;
}

export interface TidyOptions {
	/** Horizontal space between column `d` and column `d + 1` (room for the connector and its label). */
	gap: (depth: number) => number;
	/** Vertical space between neighbouring leaves. */
	gapY: number;
	/** Extra vertical space between separate trees of the forest. */
	treeGap: number;
}

export interface Placed {
	x: number;
	y: number;
	depth: number;
}

/**
 * Left-to-right tidy layout of the visible nodes. Column x of a depth = sum of the widest visible card of every
 * column before it plus the gaps; leaves stack top to bottom; a parent is centered on its children's span, but never
 * above the top of its own subtree (a parent taller than its children pushes the next rows down instead).
 */
export function tidy(f: Forest, open: ReadonlySet<string>, size: (id: string) => Size, o: TidyOptions) {
	const vis = shown(f, open);
	const colW: number[] = [];
	for (const [id, d] of vis) colW[d] = Math.max(colW[d] ?? 0, size(id).w);
	const colX = [0];
	for (let d = 1; d < colW.length; d++) colX[d] = colX[d - 1]! + colW[d - 1]! + o.gap(d - 1);
	const pos = new Map<string, Placed>();
	let row = 0;
	const place = (id: string) => {
		const d = vis.get(id)!;
		const { h } = size(id);
		const top = row;
		const ch = open.has(id) ? (f.kids.get(id) ?? []) : [];
		if (!ch.length) {
			pos.set(id, { x: colX[d]!, y: top, depth: d });
			row = top + h + o.gapY;
			return;
		}
		ch.forEach(place);
		const mids = ch.map((c) => pos.get(c)!.y + size(c).h / 2);
		const y = Math.max(top, (Math.min(...mids) + Math.max(...mids)) / 2 - h / 2);
		pos.set(id, { x: colX[d]!, y, depth: d });
		row = Math.max(row, y + h + o.gapY);
	};
	f.roots.forEach((r, i) => {
		if (i > 0) row += o.treeGap;
		place(r);
	});
	let width = 0;
	let height = 0;
	for (const [id, p] of pos) {
		width = Math.max(width, p.x + size(id).w);
		height = Math.max(height, p.y + size(id).h);
	}
	/** `colX`/`colW`: left edge and width of each column (the view aligns the connector trunks on column edges). */
	return { pos, width, height, vis, colX, colW };
}
