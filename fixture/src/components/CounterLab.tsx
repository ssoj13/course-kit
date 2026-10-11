/**
 * The fixture's lab: a counter stepped from 0 up through `captions.length - 1`, one frame per caption. Exercises the
 * lab primitives end to end (LabFrame + useTimeline + Scrubber) the way a course uses them, through the package paths.
 */
import { LabFrame } from 'course-kit/components/lab/LabFrame.tsx';
import { Scrubber } from 'course-kit/components/lab/Scrubber.tsx';
import { useTimeline } from 'course-kit/components/lab/useTimeline.ts';

export default function CounterLab({ lang, title, captions }: { lang: string; title: string; captions: string[] }) {
	const tl = useTimeline(captions, { ms: 600 });
	return (
		<LabFrame lang={lang} title={title} onReset={tl.reset}>
			<p style={{ fontSize: '2.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{tl.index}</p>
			<Scrubber lang={lang} tl={tl} caption={tl.frame} />
		</LabFrame>
	);
}
