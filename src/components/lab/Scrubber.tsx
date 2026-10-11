/**
 * Playback controls of a lab timeline (useTimeline): to the start, step back, play / pause, step forward, a slider
 * over every frame, "step i of n" and an optional caption of the current frame (announced to screen readers).
 * Keyboard, when the controls have focus: ← / → step, Space plays or pauses. On the slider the arrows are its own
 * (they move it, which seeks), and on a button Space presses that button, as everywhere else.
 *
 *   const tl = useTimeline(frames);
 *   <Scrubber lang={lang} tl={tl} caption={tl.frame.note} />
 */
import type { KeyboardEvent, ReactNode } from 'react';
import { fmt, ui } from '../../i18n.mjs';
import type { TimelineState } from './useTimeline';
import './lab.css';

export interface ScrubberProps {
	/** Page language: interface texts come from the engine's table (i18n.mjs). */
	lang: string;
	tl: TimelineState<unknown>;
	/** What the current frame shows, in words. */
	caption?: ReactNode;
}

/**
 * Control glyphs; U+FE0E asks for the text form, not the emoji one some systems draw for ⏮ and ⏸. Steps use
 * the media-player "frame step" glyphs, so step forward never looks like play.
 */
const GLYPH = { reset: '⏮︎', back: '⏴︎❙', play: '▶︎', pause: '⏸︎', forward: '❙⏵︎' };

export function Scrubber({ lang, tl, caption }: ScrubberProps) {
	const t = ui(lang);
	const last = tl.count - 1;
	const pos = fmt(t.scrubStep, { i: tl.index + 1, n: tl.count });
	const toggle = () => (tl.playing ? tl.pause() : tl.play());

	const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
		const el = e.target as HTMLElement;
		if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !(el instanceof HTMLInputElement)) {
			e.preventDefault();
			tl.step(e.key === 'ArrowLeft' ? -1 : 1);
		} else if (e.key === ' ' && !(el instanceof HTMLButtonElement)) {
			e.preventDefault(); // no page scroll
			toggle();
		}
	};

	// Buttons at an end are `aria-disabled`, not `disabled`: a disabled button drops keyboard focus, which would end
	// arrow-key stepping the moment the last frame is reached. Their actions are no-ops there anyway (clamped).
	const button = (label: string, glyph: string, onClick: () => void, off: boolean, primary = false) => (
		<button
			type="button"
			className={`lab-button${primary ? ' is-primary' : ''}`}
			onClick={onClick}
			aria-disabled={off}
			aria-label={label}
			title={label}
		>
			<span aria-hidden="true">{glyph}</span>
		</button>
	);

	return (
		<div className="ck-scrub">
			<div className="ck-scrub-bar" role="group" aria-label={t.scrubControls} tabIndex={0} onKeyDown={onKey}>
				{button(t.scrubReset, GLYPH.reset, tl.reset, tl.index === 0)}
				{button(t.scrubBack, GLYPH.back, () => tl.step(-1), tl.index === 0)}
				{tl.playing
					? button(t.scrubPause, GLYPH.pause, toggle, false, true)
					: button(t.scrubPlay, GLYPH.play, toggle, last === 0, true)}
				{button(t.scrubForward, GLYPH.forward, () => tl.step(1), tl.index === last)}
				<input
					type="range"
					className="ck-scrub-range"
					min={0}
					max={last}
					step={1}
					value={tl.index}
					disabled={last === 0}
					onChange={(e) => tl.seek(Number(e.currentTarget.value))}
					aria-label={t.scrubSlider}
					aria-valuetext={pos}
				/>
				<span className="ck-scrub-pos">{pos}</span>
			</div>
			{caption !== undefined && (
				<p className="ck-scrub-caption" aria-live="polite">
					{caption}
				</p>
			)}
		</div>
	);
}
