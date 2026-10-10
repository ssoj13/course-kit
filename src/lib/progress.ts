/**
 * Course progress: the completion record shared by <LessonDone>, <ProgressExport>, the roadmap graph and the sidebar
 * override (which marks completed lessons on every page). Keyed by lesson slug, which is the same in every language,
 * so a lesson completed in one language counts in all of them.
 */
import { ALL_VIEWS, DEFAULT_LANG, courseIn } from './course';
import { KEYS, load, save, watch } from './store';

const lessons = courseIn(DEFAULT_LANG).lessons;
export const LESSON_SLUGS: readonly string[] = lessons.map((l) => l.slug);

export type Progress = Record<string, boolean>;

/** Keeps only known lesson slugs with value `true`: storage may hold anything (old versions, hand edits). */
export function normalize(raw: unknown): Progress {
	const progress: Progress = {};
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const rec = raw as Record<string, unknown>;
		for (const slug of LESSON_SLUGS) if (rec[slug] === true) progress[slug] = true;
	}
	return progress;
}

export function readProgress(): Progress {
	return normalize(load<unknown>(KEYS.progress, {}));
}

/** Flips one lesson; returns false when storage is blocked (the change then lives for this page view only). */
export function toggleLesson(slug: string): boolean {
	const progress = readProgress();
	if (progress[slug]) delete progress[slug];
	else progress[slug] = true;
	return save(KEYS.progress, progress);
}

export interface Counts {
	core: number;
	coreTotal: number;
	optional: number;
	optionalTotal: number;
}

/** Completed/total lessons, core (non-optional modules) and optional counted separately. */
export function counts(progress: Progress): Counts {
	const c: Counts = { core: 0, coreTotal: 0, optional: 0, optionalTotal: 0 };
	for (const l of lessons) {
		const done = progress[l.slug] === true ? 1 : 0;
		if (l.optional) {
			c.optionalTotal++;
			c.optional += done;
		} else {
			c.coreTotal++;
			c.core += done;
		}
	}
	return c;
}

/** "12/15 core · 1/3 optional" in a language (the optional part only when the course has optional modules). */
export function describe(progress: Progress, lang: string): string {
	const c = counts(progress);
	const v = courseIn(lang);
	const core = v.tf('describeCore', { done: c.core, total: c.coreTotal });
	return c.optionalTotal ? `${core} · ${v.tf('describeOptional', { done: c.optional, total: c.optionalTotal })}` : core;
}

/** Sidebar link path (base-prefixed, trailing slash) -> lesson slug, for lesson pages in every language. */
const SLUG_BY_PATH = new Map(ALL_VIEWS.flatMap((v) => v.lessons.map((l) => [v.href(l.slug), l.slug] as const)));

/** Adds `.lab-nav-complete` to the Starlight sidebar links of completed lessons (matched by full path). */
export function markSidebar(progress: Progress = readProgress()): void {
	document.querySelectorAll<HTMLAnchorElement>('#starlight__sidebar a[href]').forEach((a) => {
		const path = a.pathname.endsWith('/') ? a.pathname : `${a.pathname}/`;
		const slug = SLUG_BY_PATH.get(path);
		if (slug) a.classList.toggle('lab-nav-complete', progress[slug] === true);
	});
}

/** Marks the sidebar now and whenever progress changes (this tab or another). */
export function trackSidebar(): void {
	markSidebar();
	watch(KEYS.progress, () => markSidebar());
}
