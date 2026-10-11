/**
 * Builds the Astro config of a course site.
 * @param {CourseOptions} o
 * @returns {import('astro').AstroUserConfig}
 */
export function defineCourse(o: CourseOptions): import("astro").AstroUserConfig;
export type CourseOptions = {
    /**
     * course.json (modules and lessons)
     */
    course: URL;
    /**
     * terms.json (term graph)
     */
    terms: URL;
    /**
     * origin, e.g. `https://ssoj13.github.io`
     */
    site: string;
    /**
     * base path, e.g. `/vulkan-course`
     */
    base: string;
    /**
     * GitHub repo URL (social link, "edit page" links)
     */
    repo: string;
    /**
     * extra `page:<name>` targets: name -> docs path below the base
     */
    pages?: Record<string, string> | undefined;
    /**
     * extra sidebar items appended to the "Reference" group (after Glossary)
     */
    reference?: any[] | undefined;
    /**
     * course stylesheets, loaded after the engine's (a site theme overrides the
     * `--ck-*` tokens of styles/theme.css here)
     */
    customCss?: string[] | undefined;
    /**
     * extra Starlight component overrides (engine overrides win on conflict)
     */
    components?: Record<string, string> | undefined;
    /**
     * extra Vite config, merged by Astro
     */
    vite?: import("astro").AstroUserConfig["vite"];
    /**
     * languages of the course, the first one is the default
     * (served at the base path; the others under `/<code>/`). Default: English only. Every other language needs
     * `course.<code>.json` and `terms.<code>.json` next to the manifests, and its lessons in `content/docs/<code>/`.
     */
    languages?: {
        code: string;
        label: string;
    }[] | undefined;
};
export type Language = {
    code: string;
    label: string;
    prefix: string;
};
