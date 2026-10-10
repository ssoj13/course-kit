/**
 * Self-check quiz model and rules: <Quiz> validates every question at build time (a broken quiz fails the build),
 * including the per-quiz limit on the "correct option is the longest" giveaway.
 *
 * A quiz teaches, not just grades: every option carries `why` - why this option is right, or why it is wrong (a
 * misconception named and corrected) - and every question points with `ref` to the section that explains it.
 */

export interface Option {
	text: string;
	/** Why this option is right or wrong, shown when it is picked (and the right one's, when a wrong one was). */
	why: string;
}

export interface Question {
	q: string;
	options: Option[];
	answer: number;
	/** Section that explains the topic: `#heading-anchor` on this page, or a course link (`lesson:slug#anchor`). */
	ref: string;
}

/** Every question has exactly this many options, so guessing odds are the same everywhere. */
export const OPTION_COUNT = 4;

/**
 * Structural problems of one question (empty list = valid). Takes `unknown` because the value comes
 * from MDX props or from the lint's evaluation of the MDX source, not from typed code.
 */
export function questionErrors(item: unknown): string[] {
	const errs: string[] = [];
	const it = (item ?? {}) as Partial<Record<keyof Question, unknown>>;
	const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
	if (!nonEmpty(it.q)) errs.push('empty `q`');
	if (!Array.isArray(it.options) || it.options.length !== OPTION_COUNT) {
		errs.push(`needs exactly ${OPTION_COUNT} options (has ${Array.isArray(it.options) ? it.options.length : 'none'})`);
	} else {
		it.options.forEach((o: unknown, i) => {
			const op = (o ?? {}) as Partial<Option>;
			if (!nonEmpty(op.text)) errs.push(`option ${i + 1}: empty \`text\``);
			if (!nonEmpty(op.why)) errs.push(`option ${i + 1}: empty \`why\` (explain why it is right or wrong)`);
		});
	}
	const n = Array.isArray(it.options) ? it.options.length : 0;
	if (!Number.isInteger(it.answer) || (it.answer as number) < 0 || (it.answer as number) >= n) {
		errs.push(`answer index ${String(it.answer)} is out of range 0..${n - 1}`);
	}
	if (!nonEmpty(it.ref) || !/^(#|lesson:|page:)/.test(it.ref)) errs.push('`ref` must be "#anchor", "lesson:slug#anchor" or "page:name#anchor"');
	return errs;
}

/** Length in code points, so a non-BMP character counts once. */
const len = (s: string): number => [...s].length;

/**
 * True when the correct option is strictly longer than every distractor: the classic test-taking
 * giveaway (pick the longest answer) that the quiz rules limit.
 */
export function correctIsLongest(q: Question): boolean {
	const right = len(q.options[q.answer]!.text);
	return q.options.every((o, i) => i === q.answer || len(o.text) < right);
}

/** Per quiz: at most one third of the questions may have the longest-correct giveaway (floor, min 1). */
export const giveawayLimit = (questions: number): number => Math.max(1, Math.floor(questions / 3));
