/**
 * Card around a lab island: optional title, a "reset" button when the lab passes `onReset` (the lab owns its state,
 * so reset is its callback, e.g. `useTimeline().reset`), and the full-screen toggle shared with the graph frames
 * (../fullscreen.ts). Looks like every other widget card (`lab-card` in styles/lab.css).
 *
 *   <LabFrame lang={lang} title="Frames in flight" onReset={tl.reset}>...<Scrubber lang={lang} tl={tl} /></LabFrame>
 */
import type { ReactNode } from 'react';
import { ui } from '../../i18n.mjs';
import { useFullScreen } from '../fullscreen';
import './lab.css';

export interface LabFrameProps {
	/** Page language: interface texts come from the engine's table (i18n.mjs). */
	lang: string;
	title?: string;
	/** Shows a reset button that calls it. */
	onReset?: () => void;
	children: ReactNode;
}

export function LabFrame({ lang, title, onReset, children }: LabFrameProps) {
	const t = ui(lang);
	const { full, toggle } = useFullScreen();
	return (
		<section className={`ck-lab lab-card not-content${full ? ' is-full' : ''}`} aria-label={title}>
			<div className="ck-lab-head">
				{title && <p className="lab-card-title">{title}</p>}
				<div className="ck-lab-tools">
					{onReset && (
						<button type="button" className="lab-button" onClick={onReset}>
							{t.reset}
						</button>
					)}
					<button type="button" className="lab-button" onClick={toggle} aria-pressed={full}>
						{full ? t.closeFullScreen : t.fullScreen}
					</button>
				</div>
			</div>
			<div className="ck-lab-body">{children}</div>
		</section>
	);
}
