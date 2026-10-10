/**
 * Canvas frame shared by every graph island: fixed height in the page, with a button that expands it to the whole
 * viewport (Esc or the button returns). Big maps stay readable without shrinking to fit a 45rem column.
 * The canvas is re-mounted on toggle (`key`), so react-flow's `fitView` refits to the new size.
 */
import { useEffect, useState, type ReactNode } from 'react';

export function Frame({ height, children }: { height: number; children: ReactNode }) {
	const [full, setFull] = useState(false);
	useEffect(() => {
		if (!full) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
		window.addEventListener('keydown', onKey);
		document.documentElement.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.documentElement.style.overflow = '';
		};
	}, [full]);
	return (
		<div className={`ck-graph-canvas${full ? ' is-full' : ''}`} style={full ? undefined : { height }}>
			<button type="button" className="ck-full-btn" onClick={() => setFull((f) => !f)} aria-pressed={full}>
				{full ? 'Close ✕' : 'Full screen ⤢'}
			</button>
			<div key={full ? 'full' : 'inline'} className="ck-graph-flow">
				{children}
			</div>
		</div>
	);
}
