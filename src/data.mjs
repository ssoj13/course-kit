/**
 * Course data: loading and validation of the two manifests every course provides.
 *   course.json - modules and lessons (order, slugs, titles): sidebar, numbering, URLs, progress ids;
 *                 optionally the labs (interactive simulations), each with its own page under `labs/`.
 *   terms.json  - the term graph: one node per concept, typed edges; every mind map, the glossary and
 *                 genealogy views are generated from it.
 * Plain ESM + JSDoc (not TS): it runs inside astro.config.mjs under Node, which refuses to strip types
 * from files in node_modules. Vite-side code imports the same module, so the rules exist once.
 * Every problem is collected and reported together; a bad manifest fails the build, never a page.
 */

/** @typedef {{ slug: string, title: string, short?: string, summary: string }} LessonJson */
/** @typedef {{ slug: string, title: string, summary: string, optional?: boolean, lessons: LessonJson[] }} ModuleJson */
/**
 * A lab: an interactive simulation with its own page (`labs/<slug>`), listed in the `/labs` catalog and in the
 * sidebar. `lesson` is the slug of the lesson it belongs to; without it the lab previews later material.
 * @typedef {{ slug: string, title: string, summary: string, lesson?: string }} LabJson
 */
/** @typedef {{ id: string, title: string, description: string, modules: ModuleJson[], labs?: LabJson[] }} CourseJson */

/** @typedef {{ id: string, label: string }} LayerJson */
/**
 * @typedef {object} TermJson
 * @property {string} id      stable id, used in `term:` links and `#term-<id>` glossary anchors
 * @property {string} label   display name (`VkInstance`, `dot product`)
 * @property {string} layer   depth level id from `layers` (concept / api / driver / hardware ...)
 * @property {string} def     one-line definition, ideally "X is Y built on Z"
 * @property {string} [lesson] slug of the lesson that introduces the term
 * @property {string[]} [aka] other names, shown in the glossary and searched by the term lookup
 */
/**
 * @typedef {object} EdgeJson
 * @property {string} from
 * @property {string} to
 * @property {EdgeType} type
 * @property {string} [label] verb shown on the edge ("allocated from", "created by")
 */
/** @typedef {'built-on' | 'is-a' | 'part-of' | 'uses' | 'related'} EdgeType */
/** @typedef {{ layers: LayerJson[], terms: TermJson[], edges: EdgeJson[] }} TermsJson */

/**
 * Edge semantics, shared by validation and rendering:
 *   built-on: `from` needs `to` to exist or to be understood (genealogy; "device is built on physical device")
 *   is-a:     `from` is a kind of `to`
 *   part-of:  `from` is a component of `to`
 *   uses:     `from` uses `to` without depending on it for its definition
 *   related:  see-also, no direction meaning
 * The first three form hierarchies and must stay acyclic, otherwise "down to the roots" never ends.
 */
export const EDGE_TYPES = /** @type {const} */ (['built-on', 'is-a', 'part-of', 'uses', 'related']);
export const ACYCLIC_EDGE_TYPES = /** @type {const} */ (['built-on', 'is-a', 'part-of']);

/** Top-level page names the engine owns; a module slug must not shadow them (`labs` holds the lab pages). */
export const RESERVED_SLUGS = ['roadmap', 'glossary', '404', 'progress', 'labs'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @param {unknown} v @returns {v is string} */
const str = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Validates course.json; returns it typed or throws one Error listing every problem.
 * Lesson slugs are unique across the whole course because `lesson:<slug>` links and progress keys use them alone.
 * @param {unknown} raw
 * @returns {CourseJson}
 */
export function checkCourse(raw) {
	/** @type {string[]} */
	const errs = [];
	const c = /** @type {Partial<CourseJson>} */ (raw ?? {});
	if (!str(c.id) || !SLUG.test(c.id)) errs.push('`id` must be a kebab-case slug (storage namespace)');
	if (!str(c.title)) errs.push('`title` is empty');
	if (!str(c.description)) errs.push('`description` is empty');
	if (!Array.isArray(c.modules) || c.modules.length === 0) errs.push('`modules` must be a non-empty array');
	const mods = new Set();
	const lessons = new Set();
	for (const [mi, m] of (Array.isArray(c.modules) ? c.modules : []).entries()) {
		const at = `modules[${mi}]${m?.slug ? ` "${m.slug}"` : ''}`;
		if (!str(m?.slug) || !SLUG.test(m.slug)) errs.push(`${at}: bad slug`);
		else if (RESERVED_SLUGS.includes(m.slug)) errs.push(`${at}: slug is reserved (${RESERVED_SLUGS.join(', ')})`);
		else if (mods.has(m.slug)) errs.push(`${at}: duplicate module slug`);
		mods.add(m?.slug);
		if (!str(m?.title)) errs.push(`${at}: empty title`);
		if (!str(m?.summary)) errs.push(`${at}: empty summary`);
		if (!Array.isArray(m?.lessons) || m.lessons.length === 0) {
			errs.push(`${at}: needs at least one lesson`);
			continue;
		}
		for (const [li, l] of m.lessons.entries()) {
			const lat = `${at} lessons[${li}]${l?.slug ? ` "${l.slug}"` : ''}`;
			if (!str(l?.slug) || !SLUG.test(l.slug)) errs.push(`${lat}: bad slug`);
			else if (lessons.has(l.slug)) errs.push(`${lat}: duplicate lesson slug (must be unique course-wide)`);
			lessons.add(l?.slug);
			if (!str(l?.title)) errs.push(`${lat}: empty title`);
			if (!str(l?.summary)) errs.push(`${lat}: empty summary`);
			if (l?.short !== undefined && !str(l.short)) errs.push(`${lat}: \`short\` must be non-empty when present`);
		}
	}
	// Lab slugs are their own namespace (`lab:<slug>`, `labs/<slug>` pages), unique among labs.
	if (c.labs !== undefined && !Array.isArray(c.labs)) errs.push('`labs` must be an array when present');
	const labs = new Set();
	for (const [i, l] of (Array.isArray(c.labs) ? c.labs : []).entries()) {
		const at = `labs[${i}]${l?.slug ? ` "${l.slug}"` : ''}`;
		if (!str(l?.slug) || !SLUG.test(l.slug)) errs.push(`${at}: bad slug`);
		else if (labs.has(l.slug)) errs.push(`${at}: duplicate lab slug`);
		labs.add(l?.slug);
		if (!str(l?.title)) errs.push(`${at}: empty title`);
		if (!str(l?.summary)) errs.push(`${at}: empty summary`);
		if (l?.lesson !== undefined && !(typeof l.lesson === 'string' && lessons.has(l.lesson))) errs.push(`${at}: unknown lesson "${l.lesson}"`);
	}
	if (errs.length) throw new Error(`course.json is invalid:\n  - ${errs.join('\n  - ')}`);
	return /** @type {CourseJson} */ (c);
}

/**
 * Validates terms.json against the course (lesson refs); returns it typed or throws one Error listing every problem.
 * @param {unknown} raw
 * @param {CourseJson} course
 * @returns {TermsJson}
 */
export function checkTerms(raw, course) {
	/** @type {string[]} */
	const errs = [];
	const t = /** @type {Partial<TermsJson>} */ (raw ?? {});
	const lessonSlugs = new Set(course.modules.flatMap((m) => m.lessons.map((l) => l.slug)));

	const layers = new Set();
	if (!Array.isArray(t.layers) || t.layers.length === 0) errs.push('`layers` must be a non-empty array');
	for (const [i, l] of (Array.isArray(t.layers) ? t.layers : []).entries()) {
		if (!str(l?.id) || !SLUG.test(l.id)) errs.push(`layers[${i}]: bad id`);
		else if (layers.has(l.id)) errs.push(`layers[${i}]: duplicate id "${l.id}"`);
		layers.add(l?.id);
		if (!str(l?.label)) errs.push(`layers[${i}]: empty label`);
	}

	const ids = new Set();
	if (!Array.isArray(t.terms)) errs.push('`terms` must be an array');
	for (const [i, term] of (Array.isArray(t.terms) ? t.terms : []).entries()) {
		const at = `terms[${i}]${term?.id ? ` "${term.id}"` : ''}`;
		if (!str(term?.id) || !SLUG.test(term.id)) errs.push(`${at}: bad id`);
		else if (ids.has(term.id)) errs.push(`${at}: duplicate id`);
		ids.add(term?.id);
		if (!str(term?.label)) errs.push(`${at}: empty label`);
		if (!str(term?.def)) errs.push(`${at}: empty def`);
		if (!layers.has(term?.layer)) errs.push(`${at}: unknown layer "${term?.layer}"`);
		if (term?.lesson !== undefined && !lessonSlugs.has(term.lesson)) errs.push(`${at}: unknown lesson "${term.lesson}"`);
		if (term?.aka !== undefined && !(Array.isArray(term.aka) && term.aka.every(str))) errs.push(`${at}: \`aka\` must be non-empty strings`);
	}

	const seen = new Set();
	if (!Array.isArray(t.edges)) errs.push('`edges` must be an array');
	for (const [i, e] of (Array.isArray(t.edges) ? t.edges : []).entries()) {
		const at = `edges[${i}] ${e?.from} -${e?.type}-> ${e?.to}`;
		if (!ids.has(e?.from)) errs.push(`${at}: unknown term "${e?.from}"`);
		if (!ids.has(e?.to)) errs.push(`${at}: unknown term "${e?.to}"`);
		if (!EDGE_TYPES.includes(/** @type {EdgeType} */ (e?.type))) errs.push(`${at}: unknown type (known: ${EDGE_TYPES.join(', ')})`);
		if (e?.from === e?.to) errs.push(`${at}: self edge`);
		if (e?.label !== undefined && !str(e.label)) errs.push(`${at}: \`label\` must be non-empty when present`);
		const key = `${e?.from}|${e?.type}|${e?.to}`;
		if (seen.has(key)) errs.push(`${at}: duplicate edge`);
		seen.add(key);
	}

	if (!errs.length) {
		// Genealogy walks all hierarchy types together, so their union must be acyclic, not each type alone.
		const hier = /** @type {TermsJson} */ (t).edges.filter((e) => /** @type {readonly string[]} */ (ACYCLIC_EDGE_TYPES).includes(e.type));
		const cycle = findCycle(hier);
		if (cycle) errs.push(`hierarchy edges (${ACYCLIC_EDGE_TYPES.join(', ')}) form a cycle: ${cycle.join(' -> ')}`);
	}
	if (errs.length) throw new Error(`terms.json is invalid:\n  - ${errs.join('\n  - ')}`);
	return /** @type {TermsJson} */ (t);
}

// ---------------------------------------------------------------------------------------------------------------
// Translations. A course is authored in its default language (course.json, terms.json); every other language has
// an overlay next to it (course.<locale>.json, terms.<locale>.json) that carries only the texts, keyed by the
// default manifests' slugs and ids. Structure (order, slugs, edges, lesson links) exists once. Overlays must be
// complete: a missing or unknown key fails the build, so no page silently falls back to another language.

/**
 * @typedef {{ title: string, short?: string, summary: string }} LessonText
 * @typedef {{ title: string, summary: string, lessons: Record<string, LessonText> }} ModuleText
 * @typedef {{ title: string, summary: string }} LabText
 * @typedef {{ title: string, description: string, modules: Record<string, ModuleText>, labs?: Record<string, LabText> }} CourseOverlay
 * @typedef {{ label: string, def: string, aka?: string[] }} TermText
 * @typedef {{ layers: Record<string, string>, terms: Record<string, TermText>, edges?: Record<string, string> }} TermsOverlay
 */

/** Overlay key of an edge label: `from|type|to`. */
export const edgeKey = (/** @type {{ from: string, type: string, to: string }} */ e) => `${e.from}|${e.type}|${e.to}`;

/**
 * @param {string[]} errs
 * @param {string} at
 * @param {Record<string, unknown> | undefined} rec
 * @param {Iterable<string>} expected
 */
function sameKeys(errs, at, rec, expected) {
	const want = new Set(expected);
	const have = new Set(Object.keys(rec ?? {}));
	for (const k of want) if (!have.has(k)) errs.push(`${at}: missing "${k}"`);
	for (const k of have) if (!want.has(k)) errs.push(`${at}: unknown "${k}"`);
}

/**
 * Applies a course overlay; returns the localized course (same structure, translated texts) or throws one Error
 * listing every problem.
 * @param {unknown} raw
 * @param {CourseJson} course
 * @param {string} locale
 * @returns {CourseJson}
 */
export function localizeCourse(raw, course, locale) {
	/** @type {string[]} */
	const errs = [];
	const o = /** @type {Partial<CourseOverlay>} */ (raw ?? {});
	if (!str(o.title)) errs.push('`title` is empty');
	if (!str(o.description)) errs.push('`description` is empty');
	sameKeys(errs, 'modules', o.modules, course.modules.map((m) => m.slug));
	for (const m of course.modules) {
		const mt = o.modules?.[m.slug];
		if (!mt) continue;
		if (!str(mt.title)) errs.push(`modules.${m.slug}: empty title`);
		if (!str(mt.summary)) errs.push(`modules.${m.slug}: empty summary`);
		sameKeys(errs, `modules.${m.slug}.lessons`, mt.lessons, m.lessons.map((l) => l.slug));
		for (const l of m.lessons) {
			const lt = mt.lessons?.[l.slug];
			if (!lt) continue;
			if (!str(lt.title)) errs.push(`modules.${m.slug}.lessons.${l.slug}: empty title`);
			if (!str(lt.summary)) errs.push(`modules.${m.slug}.lessons.${l.slug}: empty summary`);
			if (lt.short !== undefined && !str(lt.short)) errs.push(`modules.${m.slug}.lessons.${l.slug}: \`short\` must be non-empty when present`);
		}
	}
	// A course without labs takes no `labs` in its overlays (an entry there would be an unknown key).
	sameKeys(errs, 'labs', o.labs, (course.labs ?? []).map((l) => l.slug));
	for (const l of course.labs ?? []) {
		const lt = o.labs?.[l.slug];
		if (!lt) continue;
		if (!str(lt.title)) errs.push(`labs.${l.slug}: empty title`);
		if (!str(lt.summary)) errs.push(`labs.${l.slug}: empty summary`);
	}
	if (errs.length) throw new Error(`course.${locale}.json is invalid:\n  - ${errs.join('\n  - ')}`);
	const ov = /** @type {CourseOverlay} */ (o);
	const labTexts = /** @type {Record<string, LabText>} */ (ov.labs);
	return {
		id: course.id,
		title: ov.title,
		description: ov.description,
		modules: course.modules.map((m) => {
			const mt = ov.modules[m.slug];
			return {
				...m,
				title: mt.title,
				summary: mt.summary,
				lessons: m.lessons.map((l) => {
					const lt = mt.lessons[l.slug];
					/** @type {LessonJson} */
					const out = { slug: l.slug, title: lt.title, summary: lt.summary };
					if (lt.short) out.short = lt.short;
					return out;
				}),
			};
		}),
		...(course.labs && { labs: course.labs.map((l) => ({ ...l, title: labTexts[l.slug].title, summary: labTexts[l.slug].summary })) }),
	};
}

/**
 * Applies a terms overlay; returns the localized term graph or throws one Error listing every problem.
 * Edge labels are optional per edge: an edge labelled in the default language needs a translated label.
 * @param {unknown} raw
 * @param {TermsJson} terms
 * @param {string} locale
 * @returns {TermsJson}
 */
export function localizeTerms(raw, terms, locale) {
	/** @type {string[]} */
	const errs = [];
	const o = /** @type {Partial<TermsOverlay>} */ (raw ?? {});
	sameKeys(errs, 'layers', o.layers, terms.layers.map((l) => l.id));
	for (const [k, v] of Object.entries(o.layers ?? {})) if (!str(v)) errs.push(`layers.${k}: empty label`);
	sameKeys(errs, 'terms', o.terms, terms.terms.map((t) => t.id));
	for (const t of terms.terms) {
		const tt = o.terms?.[t.id];
		if (!tt) continue;
		if (!str(tt.label)) errs.push(`terms.${t.id}: empty label`);
		if (!str(tt.def)) errs.push(`terms.${t.id}: empty def`);
		if (tt.aka !== undefined && !(Array.isArray(tt.aka) && tt.aka.every(str))) errs.push(`terms.${t.id}: \`aka\` must be non-empty strings`);
	}
	sameKeys(errs, 'edges', o.edges, terms.edges.filter((e) => e.label).map(edgeKey));
	for (const [k, v] of Object.entries(o.edges ?? {})) if (!str(v)) errs.push(`edges["${k}"]: empty label`);
	if (errs.length) throw new Error(`terms.${locale}.json is invalid:\n  - ${errs.join('\n  - ')}`);
	const ov = /** @type {TermsOverlay} */ (o);
	return {
		layers: terms.layers.map((l) => ({ id: l.id, label: ov.layers[l.id] })),
		terms: terms.terms.map((t) => {
			const tt = ov.terms[t.id];
			/** @type {TermJson} */
			const out = { ...t, label: tt.label, def: tt.def };
			if (tt.aka) out.aka = tt.aka;
			else delete out.aka;
			return out;
		}),
		edges: terms.edges.map((e) => (e.label ? { ...e, label: ov.edges?.[edgeKey(e)] ?? e.label } : e)),
	};
}

/**
 * First directed cycle in an edge list (as a closed path of ids), or null. Iterative DFS with colors,
 * so a deep chain cannot overflow the stack.
 * @param {readonly { from: string, to: string }[]} edges
 * @returns {string[] | null}
 */
export function findCycle(edges) {
	/** @type {Map<string, string[]>} */
	const out = new Map();
	for (const e of edges) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
	/** @type {Map<string, 1 | 2>} 1 = on the current path, 2 = finished */
	const color = new Map();
	for (const start of out.keys()) {
		if (color.has(start)) continue;
		/** @type {{ id: string, next: number }[]} */
		const stack = [{ id: start, next: 0 }];
		color.set(start, 1);
		while (stack.length) {
			const top = stack[stack.length - 1];
			const kids = out.get(top.id) ?? [];
			if (top.next >= kids.length) {
				color.set(top.id, 2);
				stack.pop();
				continue;
			}
			const kid = kids[top.next++];
			const c = color.get(kid);
			if (c === 1) {
				const from = stack.findIndex((f) => f.id === kid);
				return [...stack.slice(from).map((f) => f.id), kid];
			}
			if (c === undefined) {
				color.set(kid, 1);
				stack.push({ id: kid, next: 0 });
			}
		}
	}
	return null;
}
