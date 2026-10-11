/**
 * Canvas frame shared by every graph island: fixed height in the page, a full-screen toggle (../fullscreen.ts) and a
 * "reset layout" button. Node positions belong to the island (nodes are draggable), so reset is the island's
 * `onReset`; the full-screen toggle re-mounts the canvas (`key`) so `fitView` refits to the new size while the
 * island keeps the positions.
 */
import type { ReactNode } from 'react';
import { ui } from '../../i18n.mjs';
import { useFullScreen } from '../fullscreen';

export function Frame({ lang, height, onReset, children }: { lang: string; height: number; onReset: () => void; children: ReactNode }) {
	const t = ui(lang);
	const { full, toggle } = useFullScreen();
	return (
		<div className={`ck-graph-canvas${full ? ' is-full' : ''}`} style={full ? undefined : { height }}>
			<div className="ck-tools">
				<button type="button" className="ck-tool" onClick={onReset} title={t.resetLayoutHint}>
					{t.resetLayout}
				</button>
				<button type="button" className="ck-tool" onClick={toggle} aria-pressed={full}>
					{full ? t.closeFullScreen : t.fullScreen}
				</button>
			</div>
			<div key={full ? 'full' : 'inline'} className="ck-graph-flow">
				{children}
			</div>
		</div>
	);
}
