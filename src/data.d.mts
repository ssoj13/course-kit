/**
 * Validates course.json; returns it typed or throws one Error listing every problem.
 * Lesson slugs are unique across the whole course because `lesson:<slug>` links and progress keys use them alone.
 * @param {unknown} raw
 * @returns {CourseJson}
 */
export function checkCourse(raw: unknown): CourseJson;
/**
 * Validates terms.json against the course (lesson refs); returns it typed or throws one Error listing every problem.
 * @param {unknown} raw
 * @param {CourseJson} course
 * @returns {TermsJson}
 */
export function checkTerms(raw: unknown, course: CourseJson): TermsJson;
/**
 * Applies a course overlay; returns the localized course (same structure, translated texts) or throws one Error
 * listing every problem.
 * @param {unknown} raw
 * @param {CourseJson} course
 * @param {string} locale
 * @returns {CourseJson}
 */
export function localizeCourse(raw: unknown, course: CourseJson, locale: string): CourseJson;
/**
 * Applies a terms overlay; returns the localized term graph or throws one Error listing every problem.
 * Edge labels are optional per edge: an edge labelled in the default language needs a translated label.
 * @param {unknown} raw
 * @param {TermsJson} terms
 * @param {string} locale
 * @returns {TermsJson}
 */
export function localizeTerms(raw: unknown, terms: TermsJson, locale: string): TermsJson;
/**
 * First directed cycle in an edge list (as a closed path of ids), or null. Iterative DFS with colors,
 * so a deep chain cannot overflow the stack.
 * @param {readonly { from: string, to: string }[]} edges
 * @returns {string[] | null}
 */
export function findCycle(edges: readonly {
    from: string;
    to: string;
}[]): string[] | null;
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
export const EDGE_TYPES: readonly ["built-on", "is-a", "part-of", "uses", "related"];
export const ACYCLIC_EDGE_TYPES: readonly ["built-on", "is-a", "part-of"];
/** Top-level page names the engine owns; a module slug must not shadow them (`labs` holds the lab pages). */
export const RESERVED_SLUGS: string[];
export function edgeKey(e: {
    from: string;
    type: string;
    to: string;
}): string;
export type LessonJson = {
    slug: string;
    title: string;
    short?: string;
    summary: string;
};
export type ModuleJson = {
    slug: string;
    title: string;
    summary: string;
    optional?: boolean;
    lessons: LessonJson[];
};
/**
 * A lab: an interactive simulation with its own page (`labs/<slug>`), listed in the `/labs` catalog and in the
 * sidebar. `lesson` is the slug of the lesson it belongs to; without it the lab previews later material.
 */
export type LabJson = {
    slug: string;
    title: string;
    summary: string;
    lesson?: string;
};
export type CourseJson = {
    id: string;
    title: string;
    description: string;
    modules: ModuleJson[];
    labs?: LabJson[];
};
export type LayerJson = {
    id: string;
    label: string;
};
export type TermJson = {
    /**
     * stable id, used in `term:` links and `#term-<id>` glossary anchors
     */
    id: string;
    /**
     * display name (`VkInstance`, `dot product`)
     */
    label: string;
    /**
     * depth level id from `layers` (concept / api / driver / hardware ...)
     */
    layer: string;
    /**
     * one-line definition, ideally "X is Y built on Z"
     */
    def: string;
    /**
     * slug of the lesson that introduces the term
     */
    lesson?: string | undefined;
    /**
     * other names, shown in the glossary and searched by the term lookup
     */
    aka?: string[] | undefined;
};
export type EdgeJson = {
    from: string;
    to: string;
    type: EdgeType;
    /**
     * verb shown on the edge ("allocated from", "created by")
     */
    label?: string | undefined;
};
export type EdgeType = "built-on" | "is-a" | "part-of" | "uses" | "related";
export type TermsJson = {
    layers: LayerJson[];
    terms: TermJson[];
    edges: EdgeJson[];
};
export type LessonText = {
    title: string;
    short?: string;
    summary: string;
};
export type ModuleText = {
    title: string;
    summary: string;
    lessons: Record<string, LessonText>;
};
export type LabText = {
    title: string;
    summary: string;
};
export type CourseOverlay = {
    title: string;
    description: string;
    modules: Record<string, ModuleText>;
    labs?: Record<string, LabText>;
};
export type TermText = {
    label: string;
    def: string;
    aka?: string[];
};
export type TermsOverlay = {
    layers: Record<string, string>;
    terms: Record<string, TermText>;
    edges?: Record<string, string>;
};
