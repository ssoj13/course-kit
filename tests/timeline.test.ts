import { describe, expect, test } from 'bun:test';
import { atEnd, clampIndex, playStart, stepIndex } from '../src/lib/timeline';

describe('timeline index rules', () => {
	test('clampIndex keeps an index inside the frames', () => {
		expect(clampIndex(-3, 5)).toBe(0);
		expect(clampIndex(7, 5)).toBe(4);
		expect(clampIndex(2.9, 5)).toBe(2);
		expect(clampIndex(3, 0)).toBe(0);
	});
	test('stepIndex stops at both ends', () => {
		expect(stepIndex(0, -1, 5)).toBe(0);
		expect(stepIndex(3, 1, 5)).toBe(4);
		expect(stepIndex(4, 1, 5)).toBe(4);
		expect(stepIndex(4, -10, 5)).toBe(0);
	});
	test('atEnd on the last frame and on a single-frame timeline', () => {
		expect(atEnd(3, 5)).toBe(false);
		expect(atEnd(4, 5)).toBe(true);
		expect(atEnd(0, 1)).toBe(true);
	});
	test('play resumes from the current frame, restarts from the last one', () => {
		expect(playStart(2, 5)).toBe(2);
		expect(playStart(4, 5)).toBe(0);
		expect(playStart(9, 5)).toBe(0);
	});
});
