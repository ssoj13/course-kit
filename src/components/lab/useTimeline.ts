/**
 * React binding of a lab timeline (lib/timeline.ts): the current frame index plus step / seek / play controls.
 * Playback shows each frame for `ms` and stops on the last one. Any manual move (step, seek, reset) pauses it, as in
 * a video player. `autoplay` is ignored when the reader asked the system for reduced motion; pressing play still works.
 */
import { useCallback, useEffect, useState } from 'react';
import { FRAME_MS, atEnd, clampIndex, playStart, stepIndex, type Timeline } from '../../lib/timeline';

export interface TimelineOptions {
	/** Time per frame during playback, ms (default 900). */
	ms?: number;
	/** Start playing on mount (not under prefers-reduced-motion). */
	autoplay?: boolean;
}

export interface TimelineState<T> {
	index: number;
	frame: T;
	count: number;
	/** Moves `d` frames (negative = back), stopping at the ends; pauses playback. */
	step(d: number): void;
	/** Jumps to frame `i` (clamped); pauses playback. */
	seek(i: number): void;
	/** Plays from the current frame, or from the start when on the last one. */
	play(): void;
	pause(): void;
	playing: boolean;
	/** Back to frame 0, paused. */
	reset(): void;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `frames` must not be empty: a lab always has at least its initial state. */
export function useTimeline<T>(frames: Timeline<T>, opts: TimelineOptions = {}): TimelineState<T> {
	if (frames.length === 0) throw new Error('useTimeline: a timeline needs at least one frame');
	const { ms = FRAME_MS, autoplay = false } = opts;
	const count = frames.length;
	const [raw, setIndex] = useState(0);
	const [playing, setPlaying] = useState(false);
	// The frames may be replaced by shorter ones (new inputs): the index always stays inside them.
	const index = clampIndex(raw, count);

	useEffect(() => {
		if (autoplay && !reducedMotion()) setPlaying(true);
	}, [autoplay]);

	// One timer per frame: the effect re-runs on every index change, so a pause or a manual move cancels the pending tick.
	useEffect(() => {
		if (!playing) return;
		if (atEnd(index, count)) {
			setPlaying(false);
			return;
		}
		const id = setTimeout(() => setIndex((i) => stepIndex(i, 1, count)), ms);
		return () => clearTimeout(id);
	}, [playing, index, count, ms]);

	const step = useCallback(
		(d: number) => {
			setPlaying(false);
			setIndex((i) => stepIndex(clampIndex(i, count), d, count));
		},
		[count],
	);
	const seek = useCallback(
		(i: number) => {
			setPlaying(false);
			setIndex(clampIndex(i, count));
		},
		[count],
	);
	const play = useCallback(() => {
		setIndex((i) => playStart(i, count));
		setPlaying(true);
	}, [count]);
	const pause = useCallback(() => setPlaying(false), []);
	const reset = useCallback(() => {
		setPlaying(false);
		setIndex(0);
	}, []);

	return { index, frame: frames[index]!, count, step, seek, play, pause, playing, reset };
}
