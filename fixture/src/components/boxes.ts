/**
 * Second toy trainer of the fixture ("boxes"): the parts of the trainer model the house does not use. Items exist only
 * in the state (a global action creates them), options of every kind (number, choice, item), a badge on the card.
 * Subject of the option/global/dynamic-item tests in tests/trainer.test.ts; shown next to the house on one page, which
 * also checks that two trees keep their own details windows.
 */
import type { Scenario } from '../../../src/lib/trainer';

export interface Boxes {
	boxes: readonly string[];
	size: Readonly<Record<string, number>>;
	color: Readonly<Record<string, string>>;
	/** Counter for box ids, so a merged box's id is never reused. */
	next: number;
}

const TEXT = {
	en: { add: 'Add a box', size: 'size', color: 'color', merge: 'Merge into', into: 'into', none: 'Rule BOX-merge-01: there is no other box to merge into.', goal: 'One box of size 5', red: 'red', blue: 'blue', box: 'Box {n}' },
	ru: { add: 'Добавить коробку', size: 'размер', color: 'цвет', merge: 'Сложить в', into: 'в', none: 'Правило BOX-merge-01: другой коробки, куда сложить, нет.', goal: 'Одна коробка размера 5', red: 'красная', blue: 'синяя', box: 'Коробка {n}' },
};

export function boxTexts(lang: string) {
	return lang === 'ru' ? TEXT.ru : TEXT.en;
}

export function boxScenario(lang: string): Scenario<Boxes> {
	const t = boxTexts(lang);
	return {
		id: 'boxes',
		version: '1',
		init: { boxes: [], size: {}, color: {}, next: 0 },
		items: (s) => s.boxes,
		actions: () => [
			{
				id: 'add',
				label: t.add,
				options: [
					{ kind: 'number', id: 'size', label: t.size, min: 1, max: 4, step: 1, initial: 2 },
					{ kind: 'choice', id: 'color', label: t.color, choices: [{ id: 'red', label: t.red }, { id: 'blue', label: t.blue }], initial: 'red' },
				],
				apply: (s, o) => {
					const id = `box${s.next}`;
					return {
						state: { boxes: [...s.boxes, id], size: { ...s.size, [id]: o.size as number }, color: { ...s.color, [id]: o.color as string }, next: s.next + 1 },
						log: [{ kind: 'call', text: `add(${id}, ${o.size}, ${o.color})` }],
					};
				},
			},
		],
		verbs: (_s, id) => [
			{
				id: 'merge',
				label: t.merge,
				primary: true,
				options: [{ kind: 'item', id: 'into', label: t.into, of: (st) => st.boxes.filter((b) => b !== id) }],
				check: (_st, o) => (o.into ? [] : [{ kind: 'error', text: t.none, ref: 'BOX-merge-01' }]),
				apply: (st, o) => {
					const into = o.into as string;
					return { state: { ...st, boxes: st.boxes.filter((b) => b !== id), size: { ...st.size, [into]: st.size[into]! + st.size[id]! } }, log: [{ kind: 'call', text: `merge(${id}, ${into})` }] };
				},
			},
		],
		status: (s) => (s.boxes.length > 1 ? 'ready' : 'locked'),
		badge: (s, id) => `${s.size[id]} · ${s.color[id] === 'blue' ? t.blue : t.red}`,
		goals: [{ id: 'one', label: t.goal, met: (s) => s.boxes.length === 1 && s.size[s.boxes[0]!] === 5 }],
	};
}
