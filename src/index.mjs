/**
 * `defineCourse()` - the whole Astro config of a course site from a few options.
 *
 * A course repo keeps only content (MDX lessons, its own widgets) and two manifests (course.json, terms.json);
 * everything generic is assembled here: Starlight with the sidebar generated from course.json, React islands,
 * build-time course links, generated pages (module overviews, roadmap, glossary, 404), progress marks and the
 * `virtual:course-kit/data` module through which components read the validated manifests.
 * Plain ESM + JSDoc: this file is imported by astro.config.mjs under Node (see data.mjs).
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';
import { checkCourse, checkTerms } from './data.mjs';
import { courseLinksPlugin, makeResolver } from './links.mjs';

const VIRTUAL_ID = 'virtual:course-kit/data';
const SERVER_ID = 'virtual:course-kit/server';
const PKG = 'course-kit';

/**
 * Absolute path of an engine file. Used instead of `course-kit/...` specifiers so routes, overrides and styles
 * resolve the same way whether the engine is installed from git, copied, or used in place by the fixture.
 * @param {string} p path relative to src/
 */
const own = (p) => fileURLToPath(new URL(p, import.meta.url));

/**
 * @typedef {object} CourseOptions
 * @property {URL} course     course.json (modules and lessons)
 * @property {URL} terms      terms.json (term graph)
 * @property {string} site    origin, e.g. `https://ssoj13.github.io`
 * @property {string} base    base path, e.g. `/vulkan-course`
 * @property {string} repo    GitHub repo URL (social link, "edit page" links)
 * @property {Record<string, string>} [pages] extra `page:<name>` targets: name -> docs path below the base
 * @property {any[]} [reference] extra sidebar items appended to the "Reference" group (after Glossary)
 * @property {string[]} [customCss] course stylesheets, loaded after the engine's
 * @property {Record<string, string>} [components] extra Starlight component overrides (engine overrides win on conflict)
 * @property {import('astro').AstroUserConfig['vite']} [vite] extra Vite config, merged by Astro
 */

/** @param {URL} url @param {string} what */
function readJson(url, what) {
	try {
		return JSON.parse(readFileSync(url, 'utf8'));
	} catch (e) {
		throw new Error(`course-kit: cannot read ${what} (${fileURLToPath(url)}): ${e instanceof Error ? e.message : e}`);
	}
}

/**
 * Builds the Astro config of a course site.
 * @param {CourseOptions} o
 * @returns {import('astro').AstroUserConfig}
 */
export function defineCourse(o) {
	const course = checkCourse(readJson(o.course, 'course.json'));
	const terms = checkTerms(readJson(o.terms, 'terms.json'), course);
	const resolve = makeResolver(course, terms, o.pages ?? {}, o.base);
	const data = { course, terms, site: { base: o.base, repo: o.repo, pages: o.pages ?? {} } };
	// Build-only values (filled in astro:config:setup). A separate module, so they can never reach a browser bundle.
	const server = { root: '' };

	let lessonNum = 0;
	// One group per module: its generated overview page, then lessons with the GLOBAL lesson number and the
	// optional `short` label (lib/course.ts derives the same numbers and labels for every other view).
	const moduleGroups = course.modules.map((m, i) => ({
		label: `${i + 1}. ${m.title}${m.optional ? ' (optional)' : ''}`,
		items: [
			{ label: 'Module overview', link: `/${m.slug}/`, attrs: { class: 'module-overview-link' } },
			...m.lessons.map((l) => ({ label: `${++lessonNum}. ${l.short ?? l.title}`, slug: `${m.slug}/${l.slug}` })),
		],
	}));

	return {
		site: o.site,
		base: o.base,
		markdown: { processor: satteri({ mdastPlugins: [courseLinksPlugin(resolve)] }) },
		vite: {
			...o.vite,
			plugins: [virtualModule(VIRTUAL_ID, data), virtualModule(SERVER_ID, server), ...(o.vite?.plugins ?? [])],
			// The engine ships TS and .astro sources; Vite must transform them instead of handing them to Node.
			ssr: { ...o.vite?.ssr, noExternal: [PKG, ...toArray(o.vite?.ssr?.noExternal)] },
			// One React for the page and every island, also when the engine is linked from a sibling checkout.
			resolve: { ...o.vite?.resolve, dedupe: ['react', 'react-dom', ...(o.vite?.resolve?.dedupe ?? [])] },
		},
		integrations: [
			react(),
			starlight({
				title: course.title,
				description: course.description,
				social: [{ icon: 'github', label: 'GitHub', href: o.repo }],
				editLink: { baseUrl: `${o.repo.replace(/\/$/, '')}/edit/main/` },
				customCss: [own('./styles/lab.css'), ...(o.customCss ?? [])],
				disable404Route: true, // replaced by the engine's 404 page
				components: {
					...o.components,
					Sidebar: own('./components/overrides/Sidebar.astro'),
					PageTitle: own('./components/overrides/PageTitle.astro'),
					Footer: own('./components/overrides/Footer.astro'),
				},
				routeMiddleware: own('./lib/route-links.ts'),
				lastUpdated: true,
				sidebar: [
					{ label: 'Home', link: '/' },
					{ label: 'Course roadmap', link: '/roadmap/' },
					...moduleGroups,
					{ label: 'Reference', items: [{ label: 'Glossary', link: '/glossary/' }, ...(o.reference ?? [])] },
				],
			}),
			{
				name: PKG,
				hooks: {
					'astro:config:setup': ({ config, injectRoute, addWatchFile }) => {
						addWatchFile(o.course);
						addWatchFile(o.terms);
						server.root = fileURLToPath(config.root);
						checkLessonFiles(course, new URL('content/docs/', config.srcDir));
						injectRoute({ pattern: '/[module]', entrypoint: own('./pages/module.astro') });
						injectRoute({ pattern: '/roadmap', entrypoint: own('./pages/roadmap.astro') });
						injectRoute({ pattern: '/glossary', entrypoint: own('./pages/glossary.astro') });
						injectRoute({ pattern: '/404', entrypoint: own('./pages/404.astro') });
					},
				},
			},
		],
	};
}

/**
 * Every lesson in course.json must have its page (`<docs>/<module>/<lesson>.md[x]`): a missing file would
 * otherwise only show up as a 404 behind a sidebar link.
 * @param {import('./data.mjs').CourseJson} course
 * @param {URL} docs
 */
function checkLessonFiles(course, docs) {
	const missing = course.modules.flatMap((m) =>
		m.lessons
			.map((l) => `${m.slug}/${l.slug}`)
			.filter((p) => !['.mdx', '.md'].some((ext) => existsSync(new URL(p + ext, docs)))),
	);
	if (missing.length) {
		throw new Error(`course-kit: course.json lessons without a page in ${fileURLToPath(docs)}:\n  - ${missing.join('\n  - ')}`);
	}
}

/** @template T @param {T | T[] | undefined | true} v @returns {T[]} */
function toArray(v) {
	return v === undefined || v === true ? [] : Array.isArray(v) ? v : [v];
}

/**
 * Vite plugin serving an object's fields as named exports of a virtual module. The code is generated on load,
 * so fields filled in later config hooks are included.
 * @param {string} id
 * @param {Record<string, unknown>} values
 * @returns {import('vite').Plugin}
 */
function virtualModule(id, values) {
	const resolved = `\0${id}`;
	return {
		name: `course-kit:${id}`,
		resolveId: (x) => (x === id ? resolved : undefined),
		load: (x) =>
			x === resolved
				? Object.entries(values)
						.map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
						.join('\n')
				: undefined,
	};
}
