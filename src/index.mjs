/**
 * `defineCourse()` - the whole Astro config of a course site from a few options.
 *
 * A course repo keeps only content (MDX lessons, its own widgets) and two manifests (course.json, terms.json);
 * everything generic is assembled here: Starlight with the sidebar generated from course.json, React islands,
 * build-time course links, generated pages (module overviews, roadmap, glossary, lab catalog, 404), progress marks and the
 * `virtual:course-kit/data` module through which components read the validated manifests.
 * Plain ESM + JSDoc: this file is imported by astro.config.mjs under Node (see data.mjs).
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';
import { checkCourse, checkTerms, localizeCourse, localizeTerms } from './data.mjs';
import { courseLinksPlugin, makeResolver } from './links.mjs';
import { ui } from './i18n.mjs';

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
 * @property {{ code: string, label: string }[]} [languages] languages of the course, the first one is the default
 *   (served at the base path; the others under `/<code>/`). Default: English only. Every other language needs
 *   `course.<code>.json` and `terms.<code>.json` next to the manifests, and its lessons in `content/docs/<code>/`.
 */

/** @typedef {{ code: string, label: string, prefix: string }} Language */

/**
 * The translation overlay next to a manifest: `course.json` -> `course.<code>.json`.
 * @param {URL} url @param {string} code
 */
function sibling(url, code) {
	return new URL(url.href.replace(/\.json$/, `.${code}.json`));
}

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
	/** @type {Language[]} */
	const languages = (o.languages ?? [{ code: 'en', label: 'English' }]).map((l, i) => ({ ...l, prefix: i === 0 ? '' : `/${l.code}` }));
	for (const l of languages) ui(l.code); // the engine must have interface texts for every course language
	const def = languages[0].code;

	const course = checkCourse(readJson(o.course, 'course.json'));
	const terms = checkTerms(readJson(o.terms, 'terms.json'), course);
	/** @type {Record<string, import('./data.mjs').CourseJson>} */
	const courses = { [def]: course };
	/** @type {Record<string, import('./data.mjs').TermsJson>} */
	const termsBy = { [def]: terms };
	/** @type {URL[]} */
	const overlays = [];
	for (const { code } of languages.slice(1)) {
		const cu = sibling(o.course, code);
		const tu = sibling(o.terms, code);
		overlays.push(cu, tu);
		courses[code] = localizeCourse(readJson(cu, `course.${code}.json`), course, code);
		termsBy[code] = localizeTerms(readJson(tu, `terms.${code}.json`), terms, code);
	}
	const resolvers = Object.fromEntries(
		languages.map((l) => [l.code, makeResolver(courses[l.code], termsBy[l.code], o.pages ?? {}, o.base, l.prefix)]),
	);
	const data = { languages, courses, terms: termsBy, site: { base: o.base, repo: o.repo, pages: o.pages ?? {} } };
	// Build-only values (filled in astro:config:setup). A separate module, so they can never reach a browser bundle.
	const server = { root: '' };

	/** Sidebar label in the default language plus `translations` for the others (Starlight picks by language). */
	const label = (/** @type {(code: string) => string} */ text) => ({
		label: text(def),
		translations: Object.fromEntries(languages.slice(1).map((l) => [l.code, text(l.code)])),
	});
	// One group per module: its generated overview page, then lessons with the GLOBAL lesson number and the
	// optional `short` label (lib/course.ts derives the same numbers and labels for every other view).
	let lessonNum = 0;
	const moduleGroups = course.modules.map((m, i) => ({
		...label((c) => `${i + 1}. ${courses[c].modules[i].title}${m.optional ? ` ${ui(c).optional}` : ''}`),
		items: [
			{ ...label((c) => ui(c).moduleOverview), link: `/${m.slug}/`, attrs: { class: 'module-overview-link' } },
			...m.lessons.map((l, j) => {
				const num = ++lessonNum;
				return { ...label((c) => `${num}. ${courses[c].modules[i].lessons[j].short ?? courses[c].modules[i].lessons[j].title}`), slug: `${m.slug}/${l.slug}` };
			}),
		],
	}));
	// Labs: the generated catalog, then every lab page in catalog order. No group at all for a course without labs.
	const labs = course.labs ?? [];
	const labText = (/** @type {string} */ c, /** @type {number} */ i) => /** @type {import('./data.mjs').LabJson[]} */ (courses[c].labs)[i].title;
	const labGroups = labs.length
		? [
				{
					...label((c) => ui(c).labs),
					items: [
						{ ...label((c) => ui(c).allLabs), link: '/labs/', attrs: { class: 'module-overview-link' } },
						...labs.map((l, i) => ({ ...label((c) => labText(c, i)), slug: `labs/${l.slug}` })),
					],
				},
			]
		: [];

	return {
		site: o.site,
		base: o.base,
		markdown: { processor: satteri({ mdastPlugins: [courseLinksPlugin(resolvers, def)] }) },
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
				title: Object.fromEntries(languages.map((l) => [l.code, courses[l.code].title])),
				description: course.description,
				// Default language at the base path ("root"), the others under /<code>/.
				...(languages.length > 1 && {
					defaultLocale: 'root',
					locales: Object.fromEntries(languages.map((l, i) => [i === 0 ? 'root' : l.code, { label: l.label, lang: l.code }])),
				}),
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
				// Lessons explain code line by line; wrapped lines read better than a horizontal scrollbar.
				expressiveCode: { defaultProps: { wrap: true } },
				// `link` items are prefixed with the page's language by Starlight, `slug` items resolve per language.
				sidebar: [
					{ ...label((c) => ui(c).home), link: '/' },
					{ ...label((c) => ui(c).roadmap), link: '/roadmap/' },
					...moduleGroups,
					...labGroups,
					{ ...label((c) => ui(c).reference), items: [{ ...label((c) => ui(c).glossary), link: '/glossary/' }, ...(o.reference ?? [])] },
				],
			}),
			{
				name: PKG,
				hooks: {
					'astro:config:setup': ({ config, injectRoute, addWatchFile }) => {
						for (const u of [o.course, o.terms, ...overlays]) addWatchFile(u);
						server.root = fileURLToPath(config.root);
						const docs = new URL('content/docs/', config.srcDir);
						for (const l of languages) checkLessonFiles(course, l.prefix ? new URL(`${l.code}/`, docs) : docs);
						// Generated pages exist in every language; each page reads its language from its URL.
						for (const l of languages) {
							injectRoute({ pattern: `${l.prefix}/[module]`, entrypoint: own('./pages/module.astro') });
							injectRoute({ pattern: `${l.prefix}/roadmap`, entrypoint: own('./pages/roadmap.astro') });
							injectRoute({ pattern: `${l.prefix}/glossary`, entrypoint: own('./pages/glossary.astro') });
							if (labs.length) injectRoute({ pattern: `${l.prefix}/labs`, entrypoint: own('./pages/labs.astro') });
						}
						// GitHub Pages serves one 404.html for every path, so there is one 404 page (in all languages).
						injectRoute({ pattern: '/404', entrypoint: own('./pages/404.astro') });
					},
				},
			},
		],
	};
}

/**
 * The home page, every lesson and every lab in course.json must have a page (`<docs>/index.md[x]`,
 * `<docs>/<module>/<lesson>.md[x]`, `<docs>/labs/<lab>.md[x]`), in every language: a missing file would
 * otherwise only show up as a 404 behind a sidebar link.
 * @param {import('./data.mjs').CourseJson} course
 * @param {URL} docs
 */
function checkLessonFiles(course, docs) {
	const missing = [
		'index',
		...course.modules.flatMap((m) => m.lessons.map((l) => `${m.slug}/${l.slug}`)),
		...(course.labs ?? []).map((l) => `labs/${l.slug}`),
	].filter(
		(p) => !['.mdx', '.md'].some((ext) => existsSync(new URL(p + ext, docs))),
	);
	if (missing.length) {
		throw new Error(`course-kit: pages missing in ${fileURLToPath(docs)}:\n  - ${missing.join('\n  - ')}`);
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
