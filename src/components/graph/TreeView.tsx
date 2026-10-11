/**
 * Concept tree (React island): the one way the engine and the courses draw "what hangs off what" maps (MindMap, the
 * course's object maps). Four views of the same data, chosen by the reader and remembered (lib/store.ts `treeView`):
 *   spine     roadmap.sh layout: one vertical line, a node per group change on it, same-group descendants beside it;
 *   collapse  tidy tree left to right whose branches open and close (round toggle = number of hidden children);
 *   tree      the same tree with every branch open and no toggles;
 *   outline   an indented list, like a DCC outliner, sharing the open/close state with `collapse`.
 * Each node has ONE primary parent (the solid connector, optionally labelled with the relation); other parents are
 * dashed wires when both ends are visible, otherwise a "+ from X" note on the card. Clicking a card opens the details
 * in a floating window (DetailsWindow.tsx), a separate layer: the map never moves because of it. Layout math lives in
 * lib/tree.ts (pure, tested); this file measures the cards and draws.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DetailsWindow } from './DetailsWindow';
import './tree.css';
import { anchor, makeForest, openAll, reveal as revealOpen, spine, tidy, type Size, type SpineRow } from '../../lib/tree';
import { fmt, ui } from '../../i18n.mjs';
import { KEYS, load, save, watch } from '../../lib/store';

export interface TreeItem {
	id: string;
	label: string;
	/** Definition shown in the details window. */
	def?: string;
	/** Group id (TreeGroup): selects the color, sorts children, makes the spine sections. */
	group: string;
	/** Primary parent (null/absent or not in the map = a root). */
	parent?: string | null;
	/** Label on the connector from the primary parent ("is the base of"). */
	rel?: string;
	/** Relation to the primary parent read from this node ("is built on"): the spine names the parent with it. */
	relUp?: string;
	/** Further parents: dashed wire when visible, else "+ <rel> X" (or "+ from X" without `rel`) on the card. */
	extra?: { id: string; rel?: string; note?: string }[];
	/** Monospace label: API identifiers. */
	code?: boolean;
	/** A short line under the label on the card. */
	sub?: string;
	/** Dimmed card: context from elsewhere (e.g. a term of another lesson). */
	muted?: boolean;
	/** Sentences listed in the default details body (relations in words). */
	facts?: string[];
	href?: string;
	hrefLabel?: string;
}

export interface TreeGroup {
	id: string;
	label: string;
	/** CSS color, normally a palette token (`groupColor(i)`), so light/dark and site themes recolor it. */
	color: string;
}

/** Size of the group palette of styles/theme.css (`--ck-group-1` .. `--ck-group-12`). */
export const GROUP_COLORS = 12;

/** Color of palette entry `i` (0-based, wraps): what a course passes as `TreeGroup.color` for its i-th group. */
export const groupColor = (i: number) => `var(--ck-group-${(i % GROUP_COLORS) + 1})`;

export type TreeMode = 'spine' | 'collapse' | 'tree' | 'outline';
const MODES: readonly TreeMode[] = ['spine', 'collapse', 'tree', 'outline'];
const MODE_KEY = { spine: 'treeModeSpine', collapse: 'treeModeCollapse', tree: 'treeModeTree', outline: 'treeModeOutline' } as const;
/** The view a reader sees before choosing one. */
export const DEFAULT_MODE: TreeMode = 'spine';

export interface TreeViewProps {
	lang: string;
	items: TreeItem[];
	/** Groups in sort, spine and legend order. */
	groups: TreeGroup[];
	/** Accessible name of the map. */
	label: string;
	/** Nodes visible at the start of `collapse`/`outline` (their ancestors open). Absent: the roots' children. */
	reveal?: string[] | 'all';
	hint?: string;
	/** View shown until the reader picks one (default DEFAULT_MODE): a whole-course map reads better as a tree. */
	prefer?: TreeMode;
	/** Extra classes on a card (state of a course widget: `is-alive`, ...). */
	cardClass?: (item: TreeItem) => string;
	/** Small text at the end of a card (a course widget's state in words, so it is never told by color alone). */
	cardNote?: (item: TreeItem) => ReactNode;
	/** Replaces the details body (definition, facts, link). */
	renderDetails?: (item: TreeItem) => ReactNode;
	/** Rendered under the map, inside the frame (a course widget's console). */
	children?: ReactNode;
}

/** Toggle button size + its gap to the card (tree.css `.ck-tt`). */
const TOG = 32;
const GAP_Y = 12;
const TREE_GAP = 18;
/** Connector trunk: this far right of a column's right edge; labels start 8 px after it. */
const TRUNK = 16;
/** Most dashed second-relation wires one card may send out before they are drawn only on selection. */
const FAN = 2;

/** API names break only between their words (VkDebugUtils|Messenger|EXT), never inside one. */
const breakable = (s: string) => s.split(/(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z])/).flatMap((w, i) => (i ? [<wbr key={i} />, w] : [w]));

const isMode = (m: unknown): m is TreeMode => MODES.includes(m as TreeMode);

export default function TreeView({ lang, items, groups, label, reveal, hint, prefer = DEFAULT_MODE, cardClass, cardNote, renderDetails, children }: TreeViewProps) {
	const t = ui(lang);
	const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
	const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
	const order = useMemo(() => groups.map((g) => g.id), [groups]);
	const forest = useMemo(() => makeForest(items, order), [items, order]);
	const extras = (it: TreeItem) => (it.extra ?? []).filter((x) => byId.has(x.id));

	const stored = () => {
		const m = load<unknown>(KEYS.treeView, null);
		return isMode(m) ? m : prefer;
	};
	const [mode, setMode] = useState<TreeMode>(stored);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => watch(KEYS.treeView, () => setMode(stored())), []);
	const pick = (m: TreeMode) => {
		setMode(m);
		save(KEYS.treeView, m);
	};

	const [open, setOpen] = useState<Set<string>>(() => (reveal === 'all' ? openAll(forest) : revealOpen(forest, reveal ?? [])));
	const effOpen = mode === 'tree' ? openAll(forest) : open;
	const toggles = mode === 'collapse' || mode === 'outline';
	const toggle = (id: string) =>
		setOpen((o) => {
			const n = new Set(o);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});

	// Details window: one node at a time; non-modal, so clicking another card only swaps its content.
	const [sel, setSel] = useState<string | null>(null);
	const dlgId = useId();
	const cards = useRef(new Map<string, HTMLElement>());
	/** Focus goes back to the card the window describes or, when that card is hidden now (a collapsed branch, another
	 *  view), to its nearest visible ancestor. */
	const close = useCallback(() => {
		const shown = (el?: HTMLElement): el is HTMLElement => !!el && el.isConnected && !el.closest('[inert]') && el.getClientRects().length > 0;
		for (let id: string | null | undefined = sel; id; id = forest.parent.get(id)) {
			const el = cards.current.get(id);
			if (shown(el)) {
				el.focus({ preventScroll: true });
				break;
			}
		}
		setSel(null);
	}, [sel, forest]);
	// Card sizes for the graphic layouts: measured after every render (cheap offset reads; a state bump only when
	// something changed) and on resize (web fonts arriving). Connector labels are measured too: they set column gaps.
	const measured = useRef(new Map<string, HTMLElement>());
	const sizes = useRef(new Map<string, Size>());
	const [, setVer] = useState(0);
	const remeasure = useCallback(() => {
		let changed = false;
		for (const [k, el] of measured.current) {
			const s = { w: el.offsetWidth, h: el.offsetHeight };
			const o = sizes.current.get(k);
			if (!o || o.w !== s.w || o.h !== s.h) {
				sizes.current.set(k, s);
				changed = true;
			}
		}
		return changed;
	}, []);
	const ro = useMemo(() => (typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => remeasure() && setVer((v) => v + 1))), [remeasure]);
	useEffect(() => () => ro?.disconnect(), [ro]);
	// Stable ref callbacks per key (React 19 ref cleanups), so elements are registered once, not on every render.
	const refs = useMemo(() => new Map<string, (el: HTMLElement | null) => (() => void) | undefined>(), []);
	const ref = (key: string, card?: string) => {
		let r = refs.get(key);
		if (!r) {
			r = (el: HTMLElement | null) => {
				if (!el) return;
				measured.current.set(key, el);
				if (card) cards.current.set(card, el);
				ro?.observe(el);
				return () => {
					measured.current.delete(key);
					if (card && cards.current.get(card) === el) cards.current.delete(card);
					ro?.unobserve(el);
				};
			};
			refs.set(key, r);
		}
		return r;
	};
	useLayoutEffect(() => {
		if (remeasure()) setVer((v) => v + 1);
	});

	const cardSize = (id: string): Size => sizes.current.get(`n:${id}`) ?? { w: 0, h: 0 };
	const hasKids = (id: string) => (forest.kids.get(id)?.length ?? 0) > 0;
	const nodeSize = (id: string): Size => {
		const s = cardSize(id);
		return { w: s.w + (toggles && hasKids(id) ? TOG : 0), h: s.h };
	};
	const labelSize = (id: string): Size => sizes.current.get(`l:${id}`) ?? { w: 0, h: 14 };

	const color = (it: TreeItem) => ({ '--ck-c': groupOf.get(it.group)?.color ?? 'var(--ck-ink-muted)' }) as CSSProperties;
	const name = (x: { id: string; note?: string }) => byId.get(x.id)!.label + (x.note ? ` ${x.note}` : '');
	/** "+ from A, B; + uses C": the parents the picture does not show as a line. */
	const alsoText = (xs: { id: string; rel?: string; note?: string }[]) => {
		const plain = xs.filter((x) => !x.rel).map(name);
		return [...(plain.length ? [fmt(t.treeAlso, { list: plain.join(', ') })] : []), ...xs.filter((x) => x.rel).map((x) => `+ ${x.rel} ${name(x)}`)].join('; ');
	};

	/** The card: a button that opens the details window. The same element in every view, so course state classes apply. */
	const card = (it: TreeItem, also: string, measure: boolean, extra = '') => {
		const note = cardNote?.(it);
		return (
			<button
				type="button"
				ref={measure ? ref(`n:${it.id}`, it.id) : ref(`c:${mode}:${it.id}`, it.id)}
				className={`ck-tc${it.muted ? ' is-muted' : ''}${sel === it.id ? ' is-selected' : ''} ${extra} ${cardClass?.(it) ?? ''}`}
				style={color(it)}
				aria-haspopup="dialog"
				aria-expanded={sel === it.id}
				aria-controls={sel === it.id ? dlgId : undefined}
				onClick={() => setSel(sel === it.id ? null : it.id)}
			>
				<span className={`ck-tc-label${it.code ? ' is-code' : ''}`}>{it.code ? breakable(it.label) : it.label}</span>
				{it.sub && <span className="ck-tc-sub">{it.sub}</span>}
				{also && <span className="ck-tc-also">{also}</span>}
				{note != null && note !== false && <span className="ck-tc-note">{note}</span>}
			</button>
		);
	};
	const tog = (it: TreeItem, extraClass = '') => {
		const isOpen = effOpen.has(it.id);
		const n = forest.kids.get(it.id)!.length;
		return (
			<button
				type="button"
				className={`ck-tt ${extraClass}`}
				aria-expanded={isOpen}
				aria-label={isOpen ? fmt(t.treeHide, { label: it.label }) : fmt(t.treeShow, { label: it.label, n })}
				onClick={() => toggle(it.id)}
			>
				{isOpen ? '−' : n}
			</button>
		);
	};

	let view: ReactNode;
	if (mode === 'spine') view = spineView();
	else if (mode === 'outline') view = outlineView();
	else view = treeView();

	function treeView(): ReactNode {
		// Column gap = trunk offset + the widest connector label that lands in the next column.
		const pre = tidy(forest, effOpen, nodeSize, { gap: () => 0, gapY: GAP_Y, treeGap: TREE_GAP });
		const labelW = new Map<number, number>();
		for (const [id, p] of pre.pos) if (byId.get(id)!.rel && forest.parent.get(id)) labelW.set(p.depth, Math.max(labelW.get(p.depth) ?? 0, labelSize(id).w));
		const gap = (d: number) => Math.max(44, TRUNK + 8 + (labelW.get(d + 1) ?? 0) + 14);
		const { pos, vis, colX, colW, width, height } = tidy(forest, effOpen, nodeSize, { gap, gapY: GAP_Y, treeGap: TREE_GAP });
		const ready = items.every((i) => sizes.current.has(`n:${i.id}`));
		const at = (id: string) => pos.get(anchor(forest, vis, id) ?? forest.roots[0]!) ?? { x: 0, y: 0, depth: 0 };
		const mid = (id: string) => pos.get(id)!.y + cardSize(id).h / 2;
		const trunk = (d: number) => colX[d]! + colW[d]! + TRUNK;
		// A hub ("is a kind of Vulkan object" for every API term) would fan dashed wires across the whole map: a source with
		// more than FAN visible second-relation targets is wired only while one of its ends is selected; the cards say
		// "+ ..." instead.
		const fan = new Map<string, number>();
		for (const id of pos.keys()) for (const x of extras(byId.get(id)!)) if (pos.has(x.id)) fan.set(x.id, (fan.get(x.id) ?? 0) + 1);
		const wired = (id: string, x: string) => pos.has(id) && pos.has(x) && (fan.get(x) ?? 0) <= FAN;
		const wires: ReactNode[] = [];
		for (const [id, p] of pos) {
			const par = forest.parent.get(id);
			if (par && pos.has(par)) {
				const pp = pos.get(par)!;
				const d = `M ${pp.x + nodeSize(par).w} ${mid(par)} H ${trunk(pp.depth)} V ${mid(id)} H ${p.x}`;
				wires.push(<path key={`p:${id}`} d={d} style={{ d: `path("${d}")` } as CSSProperties} />);
			}
			for (const x of extras(byId.get(id)!)) {
				const hot = sel === id || sel === x.id;
				if (!pos.has(x.id) || !(hot || wired(id, x.id))) continue;
				const ax = pos.get(x.id)!.x + cardSize(x.id).w;
				const ay = mid(x.id);
				const by = mid(id);
				const d = `M ${ax} ${ay} C ${ax + 60} ${ay} ${p.x - 60} ${by} ${p.x} ${by}`;
				wires.push(<path key={`x:${id}:${x.id}`} className={`is-extra${hot ? ' is-hot' : ''}`} d={d} style={{ d: `path("${d}")` } as CSSProperties} />);
			}
		}
		const W = width + 8;
		const H = height + 4;
		return (
			<div className={`ck-tree-canvas${ready ? '' : ' is-measuring'}`} style={{ width: W, height: H }}>
				<svg className="ck-tree-wires" width={W} height={H} aria-hidden="true">
					{wires}
				</svg>
				{items.map((it) => {
					const par = forest.parent.get(it.id);
					if (!it.rel || !par) return null;
					const p = pos.get(it.id);
					const pp = pos.get(par);
					const shownNow = !!(p && pp);
					const lx = shownNow ? trunk(pp!.depth) + 8 : at(it.id).x;
					const ly = shownNow ? mid(it.id) - labelSize(it.id).h - 2 : at(it.id).y;
					return (
						<span key={`l:${it.id}`} ref={ref(`l:${it.id}`)} className={`ck-tree-rel${shownNow ? '' : ' is-gone'}`} style={{ transform: `translate(${lx}px, ${ly}px)` }} aria-hidden="true">
							{it.rel}
						</span>
					);
				})}
				{items.map((it) => {
					const p = pos.get(it.id);
					const q = p ?? at(it.id);
					return (
						<div key={it.id} className={`ck-tn${p ? '' : ' is-gone'}`} style={{ transform: `translate(${q.x}px, ${q.y}px)` }} inert={!p} aria-hidden={!p || undefined}>
							{card(it, alsoText(extras(it).filter((x) => !wired(it.id, x.id))), true)}
							{toggles && hasKids(it.id) && tog(it)}
						</div>
					);
				})}
			</div>
		);
	}

	function outlineView(): ReactNode {
		const rows = (ids: readonly string[]): ReactNode => (
			<ul>
				{ids.map((id) => {
					const it = byId.get(id)!;
					const kids = forest.kids.get(id)!;
					return (
						<li key={id}>
							<div className="ck-orow">
								{kids.length ? tog(it, 'is-outline') : <span className="ck-tt-pad" aria-hidden="true" />}
								{card(it, alsoText(extras(it)), false, 'is-row')}
							</div>
							{kids.length > 0 && open.has(id) && rows(kids)}
						</li>
					);
				})}
			</ul>
		);
		return <div className="ck-outline">{rows(forest.roots)}</div>;
	}

	function spineView(): ReactNode {
		const sections = spine(forest, (id) => byId.get(id)!.group, order);
		/** A spine node names its parent (it is elsewhere on the spine) and its other parents. */
		const headAlso = (it: TreeItem) => {
			// A parent outside the groups (a map's synthetic root) is not worth naming.
			const p = forest.parent.get(it.id);
			const up = p && groupOf.has(byId.get(p)!.group) ? (it.relUp ? `${it.relUp} ${byId.get(p)!.label}` : fmt(t.treeFrom, { list: byId.get(p)!.label })) : '';
			return [up, alsoText(extras(it))].filter(Boolean).join('; ');
		};
		const block = (rows: SpineRow[], side: 'left' | 'right') =>
			rows.length > 0 && (
				<ul className={`ck-sp-block is-${side}`}>
					{rows.map((r) => (
						<li key={r.id} style={{ '--ck-d': r.depth - 1 } as CSSProperties}>
							{card(byId.get(r.id)!, alsoText(extras(byId.get(r.id)!)), false, 'is-side')}
						</li>
					))}
				</ul>
			);
		return (
			<div className="ck-sp-map">
				{sections.map((s, i) => {
					const g = groupOf.get(s.group);
					return (
						<section key={`${s.group}:${i}`} className="ck-sp-section">
							{g && (
								<h4 className="ck-sp-cap" style={{ '--ck-c': g.color } as CSSProperties}>
									<span>{g.label}</span>
								</h4>
							)}
							{s.heads.map((h) => {
								const it = byId.get(h.id)!;
								return (
									<div key={h.id} className={`ck-sp-row${h.left.length ? ' has-left' : ''}${h.right.length ? ' has-right' : ''}`}>
										<div className="ck-sp-side is-left">{block(h.left, 'left')}</div>
										<div className="ck-sp-node">{card(it, headAlso(it), false, 'is-head')}</div>
										<div className="ck-sp-side is-right">{block(h.right, 'right')}</div>
									</div>
								);
							})}
						</section>
					);
				})}
			</div>
		);
	}

	const cur = sel ? byId.get(sel) : undefined;
	const used = groups.filter((g) => items.some((i) => i.group === g.id));

	return (
		// Escape closes this tree's window from anywhere inside the tree (the window handles its own Escape and stops it);
		// other trees on the page keep theirs.
		<div
			className="ck-tree"
			role="group"
			aria-label={label}
			onKeyDown={(e) => {
				if (e.key === 'Escape' && sel) {
					e.preventDefault();
					close();
				}
			}}
		>
			<div className="ck-tree-bar">
				<div className="ck-seg" role="group" aria-label={t.treeView}>
					{MODES.map((m) => (
						<button key={m} type="button" aria-pressed={mode === m} onClick={() => pick(m)}>
							{t[MODE_KEY[m]]}
						</button>
					))}
				</div>
				{toggles && (
					<div className="ck-tree-tools">
						<button type="button" onClick={() => setOpen(openAll(forest))}>
							{t.treeExpandAll}
						</button>
						<button type="button" onClick={() => setOpen(revealOpen(forest, []))}>
							{t.treeCollapseAll}
						</button>
					</div>
				)}
			</div>
			{hint !== '' && <p className="ck-tree-hint">{hint ?? t.treeHint}</p>}
			<div className={`ck-tree-scroll is-${mode}`}>{view}</div>
			<div className="ck-tree-legend">
				<ul>
					{used.map((g) => (
						<li key={g.id} style={{ '--ck-c': g.color } as CSSProperties}>
							{g.label}
						</li>
					))}
				</ul>
				{mode !== 'spine' && <span>{t.treeLegendNote}</span>}
			</div>
			{children}
			{cur && (
				<DetailsWindow
					id={dlgId}
					title={<span className={cur.code ? 'is-code' : undefined}>{cur.label}</span>}
					badge={groupOf.get(cur.group)?.label}
					color={groupOf.get(cur.group)?.color ?? 'var(--ck-ink-muted)'}
					closeLabel={t.treeClose}
					anchor={cards.current.get(cur.id) ?? null}
					onClose={close}
				>
					{renderDetails ? (
						renderDetails(cur)
					) : (
						<>
							{cur.def && <p>{cur.def}</p>}
							{cur.facts && cur.facts.length > 0 && (
								<ul className="ck-win-facts">
									{cur.facts.map((f, i) => (
										<li key={i}>{f}</li>
									))}
								</ul>
							)}
							{cur.href && (
								<a className="ck-win-link" href={cur.href}>
									{cur.hrefLabel ?? cur.href}
								</a>
							)}
						</>
					)}
				</DetailsWindow>
			)}
		</div>
	);
}
