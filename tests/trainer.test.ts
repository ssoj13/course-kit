import { describe, expect, test } from 'bun:test';
import { GLOBAL, StaleAct, act, begin, complete, consistency, counts, decode, encode, goalsOf, itemsOf, optOk, optsOf, replay, undo, why, type Act, type Opts, type Run, type Scenario } from '../src/lib/trainer';
import { HOUSE_PARTS, houseScenario, type House } from '../fixture/src/components/house';
import { boxScenario } from '../fixture/src/components/boxes';

const sc = houseScenario('en');
const play = (...acts: Act[]): Run<House> => acts.reduce((r, a) => act(sc, r, a), begin(sc));
const build = (item: string, paint?: boolean): Act => ({ item, verb: 'build', ...(paint === undefined ? {} : { opts: { paint } }) });
const demolish = (item: string): Act => ({ item, verb: 'demolish' });
const status = (r: Run<House>) => Object.fromEntries(HOUSE_PARTS.map((i) => [i, sc.status(r.state, i)]));

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
	test('an unknown item, verb or option value throws StaleAct, not a console line', () => {
		expect(() => act(sc, begin(sc), { item: 'chimney', verb: 'build' })).toThrow(StaleAct);
		expect(() => act(sc, begin(sc), { item: 'chimney', verb: 'build' })).toThrow(/unknown item "chimney"/);
		expect(() => act(sc, begin(sc), { item: 'roof', verb: 'paint' })).toThrow(/has no verb "paint"/);
		expect(() => act(sc, begin(sc), { item: 'garden', verb: 'build', opts: { paint: 'yes' } })).toThrow(StaleAct);
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
	test('persistence stores the format, the scenario version and the acts, and replays them to the same run', () => {
		const r = play(build('roof'), ...order.slice(0, 2), demolish('foundation'));
		const stored = JSON.parse(JSON.stringify(encode(sc, r)));
		expect(stored).toMatchObject({ v: 2, sv: sc.version });
		expect(Object.keys(stored)).toEqual(['v', 'sv', 'acts']);
		expect(replay(sc, decode(stored, sc.version)!)).toEqual(r);
	});
	test('decode refuses foreign data, older formats and runs of another scenario version', () => {
		const acts = [build('foundation')];
		for (const bad of [null, 1, 'x', {}, { v: 1, acts }, { v: 2, acts }, { v: 2, sv: 'old', acts }, { v: 2, sv: '1', acts: [{ item: 1, verb: 'build' }] }, { v: 2, sv: '1', acts: [{ item: 'a', verb: 'b', opts: { x: null } }] }, { v: 2, sv: '1', acts: [{ item: 'a', verb: 'b', opts: [true] }] }])
			expect(decode(bad, '1')).toBeNull();
		expect(decode({ v: 2, sv: '1', acts: [{ item: 'a', verb: 'b', opts: { f: true, n: 2, c: 'x' } }] }, '1')).toHaveLength(1);
	});
	test('replay stops at the first stale act and keeps the acts before it', () => {
		const r = replay(sc, [build('foundation'), { item: 'chimney', verb: 'build' }, build('garden')]);
		expect(r.acts).toEqual([{ item: 'foundation', verb: 'build', opts: { paint: false } }]);
		expect(replay(sc, [build('foundation'), { item: 'walls', verb: 'build', opts: { paint: 3 } }]).acts).toHaveLength(1);
	});
	test('replay rethrows anything that is not a StaleAct: a throwing rule is a scenario bug', () => {
		const broken: Scenario<House> = { ...sc, verbs: (s, id) => sc.verbs(s, id).map((v) => (id === 'walls' && v.id === 'build' ? { ...v, apply: () => { throw new TypeError('boom'); } } : v)) };
		expect(() => replay(broken, [build('foundation'), build('walls'), build('garden')])).toThrow(TypeError);
	});
	test('a rule change makes the stored acts stale from the act it no longer accepts', () => {
		const acts = play(...order).acts;
		// New rules: the door is no longer part of the exercise.
		const changed: Scenario<House> = { ...sc, items: HOUSE_PARTS.filter((i) => i !== 'door') };
		const r = replay(changed, acts);
		expect(r.acts).toEqual(acts.slice(0, 3));
		expect(r.state.built).toEqual(['foundation', 'walls', 'roof']);
	});
	test('consistency: the house status agrees with its main verb in every state of a full run', () => {
		let r = begin(sc);
		for (const a of [...order, demolish('door'), demolish('roof'), build('door'), demolish('walls'), demolish('garden')]) {
			expect(consistency(sc, r.state)).toEqual([]);
			r = act(sc, r, a);
		}
		const lying: Scenario<House> = { ...sc, status: () => 'locked' };
		expect(consistency(lying, begin(sc).state)).toContain('foundation: locked, but "build" gives no reason');
		const eager: Scenario<House> = { ...sc, status: () => 'ready' };
		expect(consistency(eager, begin(sc).state)).toContain('roof: ready, but "build" is refused: Rule HOUSE-needs-01: Roof must stand on Walls.');
	});
});

const bag = boxScenario('en');

describe('option kinds, global actions, items from the state', () => {
	const add = (size?: number, color?: string): Act => ({ item: GLOBAL, verb: 'add', opts: { ...(size === undefined ? {} : { size }), ...(color === undefined ? {} : { color }) } });
	test('global actions are stored with item GLOBAL and create items', () => {
		const r = [add(), add(3, 'blue')].reduce((x, a) => act(bag, x, a), begin(bag));
		expect(itemsOf(bag, r.state)).toEqual(['box0', 'box1']);
		expect(r.acts).toEqual([
			{ item: GLOBAL, verb: 'add', opts: { size: 2, color: 'red' } },
			{ item: GLOBAL, verb: 'add', opts: { size: 3, color: 'blue' } },
		]);
		expect(counts(bag, r)).toEqual({ done: 0, total: 2, errors: 0 });
		expect(bag.badge!(r.state, 'box1')).toBe('3 · blue');
	});
	test('option values are checked per kind: number range and step, choice ids, item candidates', () => {
		const v = bag.actions!(bag.init)[0]!;
		expect(optsOf(v, bag.init)).toEqual({ size: 2, color: 'red' });
		for (const bad of [{ size: 0 }, { size: 5 }, { size: 1.5 }, { size: '2' }, { color: 'green' }, { color: true }] as Opts[]) expect(() => optsOf(v, bag.init, bad)).toThrow(StaleAct);
		const two = [add(), add()].reduce((x, a) => act(bag, x, a), begin(bag));
		const merge = bag.verbs(two.state, 'box0')[0]!;
		expect(optsOf(merge, two.state)).toEqual({ into: 'box1' });
		expect(() => optsOf(merge, two.state, { into: 'box0' })).toThrow(StaleAct);
		expect(optOk(merge.options![0]!, '', two.state)).toBe(true);
	});
	test('an item option with no candidate is empty and the rule refuses it; goals see the state', () => {
		const r = [add(), add(3), { item: 'box0', verb: 'merge' }].reduce((x, a) => act(bag, x, a), begin(bag));
		expect(r.state.boxes).toEqual(['box1']);
		expect(complete(bag, r.state)).toBe(true);
		const lone = act(bag, r, { item: 'box1', verb: 'merge' });
		expect(lone.last).toEqual({ item: 'box1', ok: false, log: [{ kind: 'error', text: 'Rule BOX-merge-01: there is no other box to merge into.', ref: 'BOX-merge-01' }] });
		expect(consistency(bag, r.state)).toEqual([]);
	});
	test('an act on an item that is gone is stale: a queued second click is ignored, a replay stops there', () => {
		const r = [add(), add(), { item: 'box0', verb: 'merge' }].reduce((x, a) => act(bag, x, a), begin(bag));
		expect(() => act(bag, r, { item: 'box0', verb: 'merge' })).toThrow(StaleAct);
		expect(replay(bag, [...r.acts, { item: 'box0', verb: 'merge' }, add()]).acts).toEqual(r.acts);
	});
});
