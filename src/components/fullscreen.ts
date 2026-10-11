/**
 * Full-screen toggle shared by every island frame (graph/Frame.tsx, lab/LabFrame.tsx): the frame covers the window
 * through CSS (`is-full`, position: fixed), not the Fullscreen API, so it works the same in every browser and keeps
 * the page's theme. While it is open, Esc closes it and the page under it does not scroll.
 */
import { useCallback, useEffect, useState } from 'react';

export function useFullScreen(): { full: boolean; toggle: () => void } {
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
	const toggle = useCallback(() => setFull((f) => !f), []);
	return { full, toggle };
}
