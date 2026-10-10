/** Validated course manifests served by the `course-kit:data` Vite plugin (src/index.mjs). */
declare module 'virtual:course-kit/data' {
	import type { CourseJson, TermsJson } from 'course-kit/data.mjs';
	/** Course languages; the first is the default (prefix ''), the others are served under `/<code>`. */
	export const languages: { code: string; label: string; prefix: string }[];
	/** The course manifest per language code (same structure, translated texts). */
	export const courses: Record<string, CourseJson>;
	/** The term graph per language code (same ids and edges, translated texts). */
	export const terms: Record<string, TermsJson>;
	export const site: { base: string; repo: string; pages: Record<string, string> };
}

/** Build-time only values; import from server code (Astro frontmatter) only. */
declare module 'virtual:course-kit/server' {
	/** Absolute path of the course project root. */
	export const root: string;
}
