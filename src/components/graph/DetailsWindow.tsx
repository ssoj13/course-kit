/**
 * Floating details window of the concept trees (TreeView): a separate layer (position: fixed) that never moves the
 * map. Non-modal: the map stays usable and clicking another node only swaps the content. Draggable by its title bar,
 * resizable from its corner; position and size are remembered per reader (lib/store.ts `treeWindow`). Below 640 px
 * it is a full-width bottom sheet without dragging. Focus moves in when it opens; the caller puts it back on the
 * node when it closes. Placement math: lib/tree.ts `placeWindow` / `clampRect`.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clampRect, placeWindow, type Rect } from '../../lib/tree';
import { KEYS, load, save } from '../../lib/store';

const MIN = { w: 300, h: 200 };
const SHEET_BELOW = 640;

const viewport = () => ({ vw: document.documentElement.clientWidth, vh: window.innerHeight });
const isRect = (r: unknown): r is Rect => !!r && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite((r as Record<string, unknown>)[k]));

export interface DetailsWindowProps {
	id: string;
	/** Node title (rendered in the title bar, names the dialog). */
	title: ReactNode;
	/** Group name next to the title. */
	badge?: string;
	/** Group color: title bar accent. */
	color: string;
	closeLabel: string;
	/** The card the window first described: kept clear of when placing. The caller returns focus on close. */
	anchor: HTMLElement | null;
	onClose: () => void;
	children: ReactNode;
}

export function DetailsWindow({ id, title, badge, color, closeLabel, anchor, onClose, children }: DetailsWindowProps) {
	const ref = useRef<HTMLElement>(null);
	const [sheet, setSheet] = useState(false);
	const [rect, setRect] = useState<Rect | null>(null);

	// Place once when opened; the anchor of the first node is the one to keep clear of.
	useLayoutEffect(() => {
		const { vw, vh } = viewport();
		setSheet(vw < SHEET_BELOW);
		const saved = load<unknown>(KEYS.treeWindow, null);
		const a = anchor?.getBoundingClientRect();
		const size = { w: Math.min(560, vw * 0.92), h: Math.min(vh * 0.7, 640) };
		setRect(placeWindow(vw, vh, size, a ? { x: a.left, y: a.top, w: a.width, h: a.height } : null, isRect(saved) ? saved : null, MIN));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Focus moves in once the window is placed (a hidden element cannot take focus).
	const focused = useRef(false);
	useEffect(() => {
		if (focused.current || (!rect && !sheet)) return;
		focused.current = true;
		ref.current?.focus({ preventScroll: true });
	}, [rect, sheet]);

	// Keep it inside the viewport when the window resizes; remember the size the reader drags it to.
	useEffect(() => {
		const onResize = () => {
			const { vw, vh } = viewport();
			setSheet(vw < SHEET_BELOW);
			setRect((r) => (r ? clampRect(r, vw, vh, MIN) : r));
		};
		window.addEventListener('resize', onResize);
		const el = ref.current;
		const ro =
			el && typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => {
						if (!el || sheet) return;
						setRect((r) => {
							if (!r || (r.w === el.offsetWidth && r.h === el.offsetHeight)) return r;
							const n = { ...r, w: el.offsetWidth, h: el.offsetHeight };
							save(KEYS.treeWindow, n);
							return n;
						});
					})
				: null;
		if (el) ro?.observe(el);
		return () => {
			window.removeEventListener('resize', onResize);
			ro?.disconnect();
		};
	}, [sheet]);

	const drag = useRef<{ dx: number; dy: number } | null>(null);
	const down = (e: PointerEvent) => {
		if (sheet || !rect || (e.target as HTMLElement).closest('button')) return;
		drag.current = { dx: e.clientX - rect.x, dy: e.clientY - rect.y };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	};
	const move = (e: PointerEvent) => {
		if (!drag.current) return;
		const { vw, vh } = viewport();
		const d = drag.current;
		setRect((r) => (r ? clampRect({ ...r, x: e.clientX - d.dx, y: e.clientY - d.dy }, vw, vh, MIN) : r));
	};
	const up = () => {
		if (!drag.current) return;
		drag.current = null;
		if (rect) save(KEYS.treeWindow, rect);
	};

	const box: CSSProperties = sheet ? {} : rect ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h } : { visibility: 'hidden' };
	const style = { ...box, '--ck-c': color } as CSSProperties;
	// A portal: a fixed element inside the page could be trapped by an ancestor's containment or transform.
	return createPortal(
		<section
			ref={ref}
			id={id}
			role="dialog"
			aria-modal="false"
			aria-labelledby={`${id}-t`}
			tabIndex={-1}
			className={`ck-win${sheet ? ' is-sheet' : ''}`}
			style={style}
			onKeyDown={(e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					e.stopPropagation();
					onClose();
				}
			}}
		>
			<header className="ck-win-bar" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
				<h3 id={`${id}-t`}>{title}</h3>
				{badge && <span className="ck-win-badge">{badge}</span>}
				<button type="button" className="ck-win-x" aria-label={closeLabel} onClick={onClose}>
					✕
				</button>
			</header>
			<div className="ck-win-body">{children}</div>
		</section>,
		document.body,
	);
}
