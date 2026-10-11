/**
 * Timeline model of the labs: a simulation is precomputed into an array of frames (one state per step), and every
 * control (step, scrub, play) only moves an index over it. Going back is then exact and free, and the same frames
 * drive the picture, the caption and the text fallback. Pure, so the rules are unit-tested; the React binding is
 * components/lab/useTimeline.ts.
 */

/** Frames of a simulation in order; frame 0 is the initial state. */
export type Timeline<T> = readonly T[];

/** Default time a frame stays on screen during playback, ms. */
export const FRAME_MS = 900;

/** `i` as a valid frame index of a timeline with `count` frames (0 when it is empty). */
export function clampIndex(i: number, count: number): number {
	return count <= 0 ? 0 : Math.min(count - 1, Math.max(0, Math.trunc(i)));
}

/** True on the last frame (and on an empty timeline): playback has nothing left to show. */
export function atEnd(i: number, count: number): boolean {
	return i >= count - 1;
}

/** Index `d` frames away from `i`, stopping at both ends. */
export function stepIndex(i: number, d: number, count: number): number {
	return clampIndex(i + d, count);
}

/** Where playback starts: from the current frame, or over from the first one when the current is the last. */
export function playStart(i: number, count: number): number {
	return atEnd(i, count) ? 0 : clampIndex(i, count);
}
