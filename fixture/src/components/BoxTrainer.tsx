/** Fixture island: the "boxes" scenario (boxes.ts) on the engine's Trainer: cards come from the state. */
import { useMemo } from 'react';
import Trainer from 'course-kit/components/trainer/Trainer.tsx';
import { groupColor, type TreeGroup, type TreeItem } from 'course-kit/components/graph/TreeView.tsx';
import { boxScenario, boxTexts, type Boxes } from './boxes';

export default function BoxTrainer({ lang }: { lang: 'en' | 'ru' }) {
	const sc = useMemo(() => boxScenario(lang), [lang]);
	const t = boxTexts(lang);
	const items = useMemo(() => (s: Boxes): TreeItem[] => s.boxes.map((id) => ({ id, label: t.box.replace('{n}', id.slice(3)), group: 'boxes' })), [t]);
	const groups: TreeGroup[] = [{ id: 'boxes', label: t.add, color: groupColor(7) }];
	return <Trainer lang={lang} scenario={sc} items={items} groups={groups} label={t.goal} />;
}
