/**
 * Typed accessors over the course manifest (course.json via `virtual:course-kit/data`): lesson/module
 * numbers, URLs, prev/next and progress ids all derive from it. The sidebar in src/index.mjs applies the same
 * numbering and `short ?? title` label rule, so keep the two in sync.
 */
import { course, site, terms } from 'virtual:course-kit/data';
import type { LessonJson, ModuleJson } from '../data.mjs';
import { makeResolver } from '../links.mjs';

export interface Lesson extends LessonJson {
	/** Global lesson number, 1..N in course order. */
	num: number;
	moduleSlug: string;
	moduleTitle: string;
	/** Module number, 1..M. */
	moduleNum: number;
	/** True for lessons of an optional module. */
	optional: boolean;
	/** Content id / URL path without base: `<module>/<lesson>`. */
	path: string;
	/** Navigation label: `short ?? title`. */
	label: string;
}

export interface Module extends Omit<ModuleJson, 'lessons' | 'optional'> {
	num: number;
	optional: boolean;
	lessons: Lesson[];
}

/** Course id: namespace of browser storage keys and download file names. */
export const COURSE_ID: string = course.id;
export const COURSE_TITLE: string = course.title;
export const REPO: string = site.repo;

let counter = 0;
export const modules: readonly Module[] = course.modules.map((m, i) => ({
	slug: m.slug,
	title: m.title,
	summary: m.summary,
	num: i + 1,
	optional: m.optional === true,
	lessons: m.lessons.map((l) => ({
		...l,
		num: ++counter,
		moduleSlug: m.slug,
		moduleTitle: m.title,
		moduleNum: i + 1,
		optional: m.optional === true,
		path: `${m.slug}/${l.slug}`,
		label: l.short ?? l.title,
	})),
}));

/** All lessons in course order. */
export const lessons: readonly Lesson[] = modules.flatMap((m) => m.lessons);

const bySlug = new Map(lessons.map((l) => [l.slug, l]));
const byPath = new Map(lessons.map((l) => [l.path, l]));

const base = (): string => import.meta.env.BASE_URL.replace(/\/$/, '');

/** Resolves `lesson:` / `page:` / `term:` URLs like the Markdown plugin does; null for other URLs. */
export const resolveLink = makeResolver(course, terms, site.pages, import.meta.env.BASE_URL);

export function lessonBySlug(slug: string): Lesson | undefined {
	return bySlug.get(slug);
}

/**
 * Finds a lesson by content id (`devices/queues`) or URL path (`/vulkan-course/devices/queues/`).
 * The base path, slashes and an `.mdx` suffix are ignored; returns undefined for non-lesson pages.
 */
export function lessonByPath(path: string): Lesson | undefined {
	let p = path.replace(/\.mdx?$/, '').replace(/^\/+|\/+$/g, '');
	const b = base().replace(/^\//, '');
	if (b && p.startsWith(`${b}/`)) p = p.slice(b.length + 1);
	return byPath.get(p.replace(/\/index$/, ''));
}

/** Absolute, base-prefixed URL of a lesson page; throws on an unknown slug. */
export function href(slug: string, hash?: string): string {
	const l = bySlug.get(slug);
	if (!l) throw new Error(`course.json has no lesson "${slug}"`);
	return `${base()}/${l.path}/${hash ? `#${hash}` : ''}`;
}

/** Absolute, base-prefixed URL of a top-level page path (`roadmap`, `glossary`, ...; '' = home). */
export function pageHref(path: string): string {
	return `${base()}/${path ? `${path.replace(/\/$/, '')}/` : ''}`;
}

/** Absolute, base-prefixed URL of a module overview page; throws on an unknown slug. */
export function moduleHref(slug: string): string {
	if (!modules.some((m) => m.slug === slug)) throw new Error(`course.json has no module "${slug}"`);
	return `${base()}/${slug}/`;
}

/** Previous / next lesson in course order (crosses module boundaries). */
export function adjacent(slug: string): { prev?: Lesson; next?: Lesson } {
	const i = lessons.findIndex((l) => l.slug === slug);
	return i < 0 ? {} : { prev: lessons[i - 1], next: lessons[i + 1] };
}
