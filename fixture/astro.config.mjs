// @ts-check
// Minimal course that builds the engine end to end. It is not a package: it runs on the engine's own
// devDependencies (`bun run fixture:build` from the repo root) and imports the engine from ../src, with
// `course-kit/...` specifiers aliased to the same sources a consumer gets through the package exports.
import { fileURLToPath } from 'node:url';
import { defineCourse } from '../src/index.mjs';

export default defineCourse({
	site: 'https://example.github.io',
	base: '/fixture',
	repo: 'https://github.com/ssoj13/course-kit',
	course: new URL('./src/data/course.json', import.meta.url),
	terms: new URL('./src/data/terms.json', import.meta.url),
	languages: [
		{ code: 'en', label: 'English' },
		{ code: 'ru', label: 'Русский' },
	],
	vite: {
		resolve: { alias: [{ find: /^course-kit\//, replacement: fileURLToPath(new URL('../src/', import.meta.url)) }] },
	},
});
