/**
 * Self-check quiz model and rules: <Quiz> validates every question at build time (a broken quiz fails the build),
 * including the per-quiz limit on answers that their length alone gives away (longest or shortest option).
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

/** Test-taking strategies that pick an option by its length alone. */
export type LengthGuess = 'longest' | 'shortest';

/**
 * The length strategy that finds this question's answer: the correct option is strictly longer (or strictly
 * shorter) than every distractor. `null` when length alone does not single it out.
 */
export function lengthGuess(q: Question): LengthGuess | null {
	const right = len(q.options[q.answer]!.text);
	const others = q.options.filter((_, i) => i !== q.answer).map((o) => len(o.text));
	if (others.every((l) => l < right)) return 'longest';
	if (others.every((l) => l > right)) return 'shortest';
	return null;
}

/** Per quiz and per strategy: it may find at most a third of the answers (floor, min 1) - no better than luck. */
export const giveawayLimit = (questions: number): number => Math.max(1, Math.floor(questions / 3));

/**
 * Every problem of a whole quiz (empty = valid): each question's structure, then each length strategy that would
 * find more answers than `giveawayLimit`. The single rule set for <Quiz> at build time and for course lints.
 */
export function quizErrors(questions: unknown): string[] {
	if (!Array.isArray(questions) || questions.length === 0) return ['`questions` must be a non-empty array'];
	const errs = questions.flatMap((item, i) => questionErrors(item).map((e) => `question ${i + 1}: ${e}`));
	if (errs.length) return errs;
	const qs = questions as Question[];
	const limit = giveawayLimit(qs.length);
	for (const guess of ['longest', 'shortest'] as const) {
		const hits = qs.filter((q) => lengthGuess(q) === guess);
		if (hits.length > limit) {
			errs.push(`${hits.length}/${qs.length} questions have the correct option as the ${guess} (limit ${limit}): ${hits.map((q) => `"${q.q.slice(0, 50)}"`).join(', ')}`);
		}
	}
	return errs;
}
