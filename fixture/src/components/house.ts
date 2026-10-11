/**
 * Toy trainer scenario of the fixture course ("build a house"), also the subject of tests/trainer.test.ts. It uses
 * every part of the trainer model: a dependency rule with a quoted rule id, a refused demolition (bearing parts), a
 * part left broken (`error` status) by a demolition, a verb option, and a goal.
 */
import { allDone, type Entry, type Scenario, type Verb } from '../../../src/lib/trainer';

export interface House {
	built: readonly string[];
	/** Built parts whose support was demolished. */
	hanging: readonly string[];
	/** Parts painted when built (the verb option). */
	painted: readonly string[];
}

/** What each part stands on; `bearing` parts refuse to be demolished from under them, others are left hanging. */
const PARTS: Record<string, { on: string[]; bearing: boolean }> = {
	foundation: { on: [], bearing: true },
	walls: { on: ['foundation'], bearing: true },
	roof: { on: ['walls'], bearing: true },
	door: { on: ['walls'], bearing: false },
	garden: { on: [], bearing: true },
};
export const HOUSE_PARTS = Object.keys(PARTS);

const TEXT = {
	en: {
		build: 'Build',
		demolish: 'Demolish',
		paint: 'paint it',
		goal: 'Every part of the house stands',
		already: '{x} already stands.',
		missing: '{x} is not built.',
		needs: 'Rule HOUSE-needs-01: {x} must stand on {y}.',
		bearing: 'Rule HOUSE-bearing-01: {y} rests on {x}; demolish it first.',
		hangs: '{y} now hangs in the air.',
		parts: { foundation: 'Foundation', walls: 'Walls', roof: 'Roof', door: 'Door', garden: 'Garden' } as Record<string, string>,
	},
	ru: {
		build: 'Построить',
		demolish: 'Снести',
		paint: 'покрасить',
		goal: 'Все части дома стоят',
		already: '{x}: уже построено.',
		missing: '{x}: не построено.',
		needs: 'Правило HOUSE-needs-01: {x} ставится на {y}.',
		bearing: 'Правило HOUSE-bearing-01: {y} опирается на {x}; сначала снесите это.',
		hangs: '{y}: теперь висит в воздухе.',
		parts: { foundation: 'Фундамент', walls: 'Стены', roof: 'Крыша', door: 'Дверь', garden: 'Сад' } as Record<string, string>,
	},
};

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

export function houseTexts(lang: string) {
	return lang === 'ru' ? TEXT.ru : TEXT.en;
}

export function houseScenario(lang: string): Scenario<House> {
	const t = houseTexts(lang);
	const name = (id: string) => t.parts[id]!;
	const err = (text: string, ref: string): Entry => ({ kind: 'error', text, ref });
	const buildCheck = (s: House, id: string): Entry[] => [
		...(s.built.includes(id) ? [{ kind: 'info' as const, text: fill(t.already, { x: name(id) }) }] : []),
		...PARTS[id]!.on.filter((p) => !s.built.includes(p)).map((p) => err(fill(t.needs, { x: name(id), y: name(p) }), 'HOUSE-needs-01')),
	];
	const verbs = (_s: House, id: string): Verb<House>[] => [
		{
			id: 'build',
			label: t.build,
			primary: true,
			options: [{ kind: 'flag', id: 'paint', label: t.paint, initial: false }],
			check: (s) => buildCheck(s, id),
			apply: (s, o) => ({
				state: { ...s, built: [...s.built, id], painted: o.paint ? [...s.painted, id] : s.painted },
				log: [{ kind: 'call', text: `build(${id}${o.paint ? ', painted' : ''})` }],
			}),
		},
		{
			id: 'demolish',
			label: t.demolish,
			check: (s) => {
				if (!s.built.includes(id)) return [{ kind: 'info', text: fill(t.missing, { x: name(id) }) }];
				return s.built.filter((b) => PARTS[b]!.on.includes(id) && PARTS[b]!.bearing).map((b) => err(fill(t.bearing, { x: name(id), y: name(b) }), 'HOUSE-bearing-01'));
			},
			apply: (s) => {
				const left = s.built.filter((b) => b !== id && PARTS[b]!.on.includes(id));
				return {
					state: { built: s.built.filter((b) => b !== id), hanging: [...s.hanging.filter((h) => h !== id), ...left], painted: s.painted.filter((p) => p !== id) },
					log: [{ kind: 'call', text: `demolish(${id})` }, ...left.map((b): Entry => ({ kind: 'warn', text: fill(t.hangs, { y: name(b) }) }))],
				};
			},
		},
	];
	return {
		id: 'house',
		version: '1',
		init: { built: [], hanging: [], painted: [] },
		items: HOUSE_PARTS,
		verbs,
		status: (s, id) => (s.hanging.includes(id) ? 'error' : s.built.includes(id) ? 'done' : buildCheck(s, id).length ? 'locked' : 'ready'),
		goals: [allDone(t.goal)],
	};
}
