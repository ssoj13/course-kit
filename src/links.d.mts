/**
 * Builds a resolver bound to one course and one language.
 * @param {import('./data.mjs').CourseJson} course
 * @param {import('./data.mjs').TermsJson} terms
 * @param {Record<string, string>} pages extra page name -> path below the base (course-specific docs pages)
 * @param {string} base site base path, e.g. `/vulkan-course`
 * @param {string} [prefix] language prefix: '' for the default language, `/ru` for Russian
 */
export function makeResolver(course: import("./data.mjs").CourseJson, terms: import("./data.mjs").TermsJson, pages: Record<string, string>, base: string, prefix?: string): (url: string, where?: string) => string | null;
/**
 * Language of a docs file from its path: `.../content/docs/<code>/...` for a non-default language, else the default.
 * @param {string} path file path or file URL
 * @param {readonly string[]} others non-default language codes
 * @param {string} fallback default language code
 */
export function langOfFile(path: string, others: readonly string[], fallback: string): string;
/**
 * Sätteri mdast plugin (Astro 7's Markdown/MDX processor): rewrites course links in Markdown links and link
 * definitions, in the language of the file. JSX `href`s are not touched; components resolve through lib/course.ts.
 * @param {Record<string, (url: string, where?: string) => string | null>} resolvers per language code
 * @param {string} fallback default language code
 */
export function courseLinksPlugin(resolvers: Record<string, (url: string, where?: string) => string | null>, fallback: string): {
    name: string;
    link: (node: {
        url: string;
    }, ctx: any) => void;
    definition: (node: {
        url: string;
    }, ctx: any) => void;
};
export namespace ENGINE_PAGES {
    let home: string;
    let roadmap: string;
    let glossary: string;
}
export function termAnchor(id: string): string;
