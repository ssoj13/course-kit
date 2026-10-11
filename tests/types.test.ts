import { expect, test } from 'bun:test';
import { emit, stale } from '../scripts/types';

test('src/*.d.mts match the .mjs modules (else run bun scripts/types.ts)', () => {
	const fresh = emit();
	expect([...fresh.keys()].sort()).toEqual(['data.d.mts', 'i18n.d.mts', 'index.d.mts', 'links.d.mts']);
	expect(stale(fresh)).toEqual([]);
}, 60_000);
