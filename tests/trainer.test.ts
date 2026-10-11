import { describe, expect, test } from 'bun:test';
import { act, begin, complete, counts, decode, encode, goalsOf, replay, undo, why, type Act, type Run } from '../src/lib/trainer';
import { houseScenario, type House } from '../fixture/src/components/house';

const sc = houseScenario('en');
const play = (...acts: Act[]): Run<House> => acts.reduce((r, a) => act(sc, r, a), begin(sc));
const build = (item: string, paint?: boolean): Act => ({ item, verb: 'build', ...(paint === undefined ? {} : { opts: { paint } }) });
const demolish = (item: string): Act => ({ item, verb: 'demolish' });
const status = (r: Run<House>) => Object.fromEntries(sc.items.map((i) => [i, sc.status(r.state, i)]));

describe('actions and rules', () => {
	test('a refused action keeps the state and reports every failure with its rule id', () => {
		const r = play(build('roof'));
		expect(r.state).toEqual(sc.init);
		expect(r.last).toEqual({ item: 'roof', ok: false, log: [{ kind: 'error', text: 'Rule HOUSE-needs-01: Roof must stand on Walls.', ref: 'HOUSE-needs-01' }] });
		expect(counts(sc, r)).toEqual({ done: 0, total: 5, errors: 1 });
	});
	test('an accepted action applies the transition and logs its lines with the act index', () => {
		const r = play(build('foundation'), build('walls', true));
		expect(r.state.built).toEqual(['foundation', 'walls']);
		expect(r.state.painted).toEqual(['walls']);
		expect(r.log).toEqual([
			{ kind: 'call', text: 'build(foundation)', act: 0 },
			{ kind: 'call', text: 'build(walls, painted)', act: 1 },
		]);
		expect(r.last?.ok).toBe(true);
	});
	test('option values: defaults fill in, undeclared options are dropped from the stored act', () => {
		const r = act(sc, begin(sc), { item: 'garden', verb: 'build', opts: { paint: true, bogus: true } });
		expect(r.acts).toEqual([{ item: 'garden', verb: 'build', opts: { paint: true } }]);
		expect(play(build('garden')).acts).toEqual([{ item: 'garden', verb: 'build', opts: { paint: false } }]);
	});
	test('an unknown item or verb is a programming error, not a console line', () => {
		expect(() => act(sc, begin(sc), { item: 'chimney', verb: 'build' })).toThrow(/unknown item "chimney"/);
		expect(() => act(sc, begin(sc), { item: 'roof', verb: 'paint' })).toThrow(/has no verb "paint"/);
	});
	test('statuses: locked, ready, done, and error after a demolition leaves a part hanging', () => {
		expect(status(begin(sc))).toEqual({ foundation: 'ready', walls: 'locked', roof: 'locked', door: 'locked', garden: 'ready' });
		const r = play(build('foundation'), build('walls'), build('door'), demolish('walls'));
		expect(r.last?.log.at(-1)).toEqual({ kind: 'warn', text: 'Door now hangs in the air.' });
		expect(status(r)).toMatchObject({ foundation: 'done', walls: 'ready', door: 'error' });
	});
	test('a bearing part refuses demolition (rule failure), a missing one is only a remark', () => {
		const r = play(build('foundation'), build('walls'), build('roof'), demolish('walls'));
		expect(r.last?.log).toEqual([{ kind: 'error', text: 'Rule HOUSE-bearing-01: Roof rests on Walls; demolish it first.', ref: 'HOUSE-bearing-01' }]);
		expect(play(demolish('roof')).last?.log).toEqual([{ kind: 'info', text: 'Roof is not built.' }]);
	});
	test('why: a locked item explains itself with its main verb\'s failures, without remarks', () => {
		expect(why(sc, begin(sc).state, 'roof').map((f) => f.ref)).toEqual(['HOUSE-needs-01']);
		expect(why(sc, begin(sc).state, 'foundation')).toEqual([]);
		expect(why(sc, play(build('garden')).state, 'garden')).toEqual([]);
	});
});

describe('history', () => {
	const order = [build('foundation'), build('walls'), build('roof'), build('door'), build('garden')];
	test('goals: complete only when every part stands', () => {
		expect(goalsOf(sc, begin(sc).state)).toEqual([{ id: 'all-done', label: 'Every part of the house stands', met: false }]);
		expect(complete(sc, play(...order.slice(0, 4)).state)).toBe(false);
		expect(complete(sc, play(...order).state)).toBe(true);
	});
	test('undo replays without the last act, including its console lines and the last result', () => {
		const r = play(...order.slice(0, 3), build('roof'));
		const u = undo(sc, r);
		expect(u.acts).toHaveLength(3);
		expect(u.log.map((l) => l.text)).toEqual(['build(foundation)', 'build(walls)', 'build(roof)']);
		expect(u.last).toEqual({ item: 'roof', ok: true, log: [{ kind: 'call', text: 'build(roof)' }] });
		expect(undo(sc, begin(sc))).toEqual(begin(sc));
	});
	test('persistence stores the acts only and replays them to the same run', () => {
		const r = play(build('roof'), ...order.slice(0, 2), demolish('foundation'));
		const stored = JSON.parse(JSON.stringify(encode(r)));
		expect(Object.keys(stored)).toEqual(['v', 'acts']);
		expect(replay(sc, decode(stored)!)).toEqual(r);
	});
	test('decode refuses foreign data; replay stops at the first act the scenario no longer has', () => {
		for (const bad of [null, 1, 'x', {}, { v: 2, acts: [] }, { v: 1, acts: [{ item: 1, verb: 'build' }] }, { v: 1, acts: [{ item: 'a', verb: 'b', opts: { x: 1 } }] }]) expect(decode(bad)).toBeNull();
		const r = replay(sc, [build('foundation'), { item: 'chimney', verb: 'build' }, build('garden')]);
		expect(r.acts).toEqual([{ item: 'foundation', verb: 'build', opts: { paint: false } }]);
	});
});
