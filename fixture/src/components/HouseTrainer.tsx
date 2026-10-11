/** Fixture island: the toy "build a house" scenario (house.ts) on the engine's Trainer. */
import { useMemo } from 'react';
import Trainer from 'course-kit/components/trainer/Trainer.tsx';
import { groupColor, type TreeGroup, type TreeItem } from 'course-kit/components/graph/TreeView.tsx';
import { houseScenario, houseTexts } from './house';

const GROUPS = ['ground', 'body', 'top'] as const;
const PART_GROUP: Record<string, (typeof GROUPS)[number]> = { foundation: 'ground', garden: 'ground', walls: 'body', door: 'body', roof: 'top' };
const PARENT: Record<string, string | null> = { foundation: null, garden: null, walls: 'foundation', roof: 'walls', door: 'walls' };
const GROUP_LABEL = { en: { ground: 'ground', body: 'body', top: 'top' }, ru: { ground: 'основание', body: 'корпус', top: 'верх' } };

export default function HouseTrainer({ lang }: { lang: 'en' | 'ru' }) {
	const sc = useMemo(() => houseScenario(lang), [lang]);
	const t = houseTexts(lang);
	const items: TreeItem[] = sc.items.map((id) => ({ id, label: t.parts[id]!, group: PART_GROUP[id]!, parent: PARENT[id], def: id }));
	const groups: TreeGroup[] = GROUPS.map((g, i) => ({ id: g, label: GROUP_LABEL[lang][g], color: groupColor(i) }));
	return <Trainer lang={lang} scenario={sc} items={items} groups={groups} label={t.goal} body={(it) => <p>{it.label}</p>} />;
}
