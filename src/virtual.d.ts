/** Validated course manifests served by the `course-kit:data` Vite plugin (src/index.mjs). */
declare module 'virtual:course-kit/data' {
	import type { CourseJson, TermsJson } from 'course-kit/data.mjs';
	export const course: CourseJson;
	export const terms: TermsJson;
	export const site: { base: string; repo: string; pages: Record<string, string> };
}
