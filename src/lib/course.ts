/**
 * Typed accessors over the course manifests (`virtual:course-kit/data`), per language: lesson/module numbers, URLs,
 * prev/next and links all derive from course.json (+ its translation overlays). Structure (order, slugs, numbers)
 * is the same in every language; only texts and URL prefixes differ. The sidebar in src/index.mjs applies the same
 * numbering and `short ?? title` label rule, so keep the two in sync.
 *
 * Components get their language with `langOf(url)` (the URL decides: `/<base>/ru/...` is Russian) and work with
 * `courseIn(lang)`.
 */
import { courses, languages, site, terms } from 'virtual:course-kit/data';
import type { LessonJson, ModuleJson } from '../data.mjs';
import { makeResolver } from '../links.mjs';
import { fmt, ui, type UiText } from '../i18n.mjs';

export interface Lesson extends LessonJson {
	/** Global lesson number, 1..N in course order. */
	num: number;
	moduleSlug: string;
	moduleTitle: string;
	/** Module number, 1..M. */
	moduleNum: number;
	/** True for lessons of an optional module. */
	optional: boolean;
	/** Content id / URL path without base and language: `<module>/<lesson>`. */
	path: string;
	/** Navigation label: `short ?? title`. */
	label: string;
}

export interface Module extends Omit<ModuleJson, 'lessons' | 'optional'> {
	num: number;
	optional: boolean;
	lessons: Lesson[];
}

export interface Language {
	code: string;
	label: string;
	/** '' for the default language, `/<code>` for the others. */
	prefix: string;
}

export const LANGUAGES: readonly Language[] = languages;
export const DEFAULT_LANG: string = languages[0]!.code;

/** Course id: namespace of browser storage keys and download file names (one per course, not per language). */
export const COURSE_ID: string = courses[DEFAULT_LANG]!.id;
export const REPO: string = site.repo;

const base = (): string => import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Language of a URL path or content id: `/<base>/ru/devices/x/` and `ru/devices/x` are Russian, anything without a
 * language segment is the default language.
 */
export function langOf(path: string): string {
	let p = path.replace(/^\/+/, '');
	const b = base().replace(/^\//, '');
	if (b && (p === b || p.startsWith(`${b}/`))) p = p.slice(b.length).replace(/^\/+/, '');
	const first = p.split('/')[0] ?? '';
	return LANGUAGES.some((l) => l.prefix && l.code === first) ? first : DEFAULT_LANG;
}

/** The course in one language. */
export interface CourseView {
	lang: string;
	prefix: string;
	/** Interface texts of the engine in this language. */
	t: UiText;
	title: string;
	description: string;
	modules: readonly Module[];
	lessons: readonly Lesson[];
	lessonBySlug(slug: string): Lesson | undefined;
	/** By content id (`ru/devices/queues`, `devices/queues`) or URL path; base, language, slashes, `.mdx` ignored. */
	lessonByPath(path: string): Lesson | undefined;
	/** Absolute URL of a lesson page in this language; throws on an unknown slug. */
	href(slug: string, hash?: string): string;
	/** Absolute URL of a top-level page path in this language (`roadmap`, `glossary`; '' = home). */
	pageHref(path: string): string;
	/** Absolute URL of a module overview page in this language; throws on an unknown slug. */
	moduleHref(slug: string): string;
	/** Previous / next lesson in course order (crosses module boundaries). */
	adjacent(slug: string): { prev?: Lesson; next?: Lesson };
	/** Resolves `lesson:` / `page:` / `term:` URLs like the Markdown plugin does; null for other URLs. */
	resolveLink(url: string, where?: string): string | null;
	/** `fmt(t[key], vars)` */
	tf(key: keyof UiText, vars: Record<string, string | number>): string;
}

function makeView(lang: Language): CourseView {
	const c = courses[lang.code]!;
	const t = ui(lang.code);
	let counter = 0;
	const modules: Module[] = c.modules.map((m, i) => ({
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
	const lessons = modules.flatMap((m) => m.lessons);
	const bySlug = new Map(lessons.map((l) => [l.slug, l]));
	const byPath = new Map(lessons.map((l) => [l.path, l]));
	const root = () => `${base()}${lang.prefix}`;
	const resolver = makeResolver(c, terms[lang.code]!, site.pages, import.meta.env.BASE_URL, lang.prefix);
	return {
		lang: lang.code,
		prefix: lang.prefix,
		t,
		title: c.title,
		description: c.description,
		modules,
		lessons,
		lessonBySlug: (slug) => bySlug.get(slug),
		lessonByPath(path) {
			let p = path.replace(/\.mdx?$/, '').replace(/^\/+|\/+$/g, '');
			const b = base().replace(/^\//, '');
			if (b && p.startsWith(`${b}/`)) p = p.slice(b.length + 1);
			if (lang.prefix && p.startsWith(`${lang.code}/`)) p = p.slice(lang.code.length + 1);
			return byPath.get(p.replace(/\/index$/, ''));
		},
		href(slug, hash) {
			const l = bySlug.get(slug);
			if (!l) throw new Error(`course.json has no lesson "${slug}"`);
			return `${root()}/${l.path}/${hash ? `#${hash}` : ''}`;
		},
		pageHref: (path) => `${root()}/${path ? `${path.replace(/\/$/, '')}/` : ''}`,
		moduleHref(slug) {
			if (!modules.some((m) => m.slug === slug)) throw new Error(`course.json has no module "${slug}"`);
			return `${root()}/${slug}/`;
		},
		adjacent(slug) {
			const i = lessons.findIndex((l) => l.slug === slug);
			return i < 0 ? {} : { prev: lessons[i - 1], next: lessons[i + 1] };
		},
		resolveLink: (url, where) => resolver(url, where),
		tf: (key, vars) => fmt(t[key], vars),
	};
}

const views = new Map(LANGUAGES.map((l) => [l.code, makeView(l)]));

/** The course in a language; throws for a language the course does not have. */
export function courseIn(lang: string): CourseView {
	const v = views.get(lang);
	if (!v) throw new Error(`the course has no language "${lang}" (known: ${[...views.keys()].join(', ')})`);
	return v;
}

/** Every language's view (progress marks, which must recognize lesson URLs in all languages). */
export const ALL_VIEWS: readonly CourseView[] = [...views.values()];
