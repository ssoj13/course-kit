/** Validated course manifests served by the `course-kit:data` Vite plugin (src/index.mjs). */
declare module 'virtual:course-kit/data' {
	import type { CourseJson, TermsJson } from 'course-kit/data.mjs';
	export const course: CourseJson;
	export const terms: TermsJson;
	export const site: { base: string; repo: string; pages: Record<string, string> };
}

/** Build-time only values; import from server code (Astro frontmatter) only. */
declare module 'virtual:course-kit/server' {
	/** Absolute path of the course project root. */
	export const root: string;
}
