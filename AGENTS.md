# course-kit — working notes for agents

Keep this file current: structure, decisions, traps, TODOs (`[ ]` / `[x]`). `CLAUDE.md` only imports it.

## What this is

The shared engine of the interactive textbooks (`vulkan_en` now; `vllm_en` and `math_en` will migrate).
A course repo keeps only content (MDX lessons, its own widgets) plus two manifests; this package turns them
into a Starlight site: sidebar, numbering, links, generated pages, progress, quizzes, term graph, mind maps.
Repo: `ssoj13/course-kit` — MUST stay public: course sites install it as a git dependency in GitHub Actions,
which has no credentials for private repos.

## How a course uses it

```js
// astro.config.mjs
import { defineCourse } from 'course-kit';
export default defineCourse({ site, base, repo, course: new URL('./src/data/course.json', import.meta.url),
  terms: new URL('./src/data/terms.json', import.meta.url) });
```
`package.json`: `"course-kit": "github:ssoj13/course-kit#vX.Y.Z"` plus the peers (astro, @astrojs/starlight,
@astrojs/react, @astrojs/markdown-satteri, react, react-dom). Lessons live at `src/content/docs/<module>/<lesson>.mdx`.
Components: `course-kit/components/{MindMap,Term,Quiz,CourseMap,ProgressExport,Snippet,CodeTabs}.astro`.
Code in lessons comes from real files: `<Snippet src="examples/x.rs#region" />`, `<CodeTabs items={{ Rust: '...#r', 'C++': '...#r' }} />`;
sources mark regions with `// #region name` ... `// #endregion` (any line-comment syntax; markers never shown).
Links in Markdown: `lesson:<slug>[#a]`, `page:<roadmap|glossary|home|course pages>`, `term:<id>`.

## Layout

- `src/index.mjs` — `defineCourse()`: validates manifests, builds the Astro config, `virtual:course-kit/data`,
  injects pages (`/[module]`, `/roadmap`, `/glossary`, `/404`), checks every lesson has a page.
- `src/data.mjs` — manifest types (JSDoc) and validation; `src/links.mjs` — course link resolver + Markdown plugin.
- `src/lib/` (TS, Vite side): `course.ts` (numbering/URLs), `graph.ts` (pure term-graph queries), `terms.ts`
  (binds graph.ts to the course), `layout.ts` (dagre, build time), `store.ts`, `progress.ts`, `element.ts`
  (custom-element base), `ui.ts`, `quiz.ts`, `route-links.ts` (Starlight middleware), `regions.ts` (pure region
  extraction), `snippets.ts` (build-time file reads via `virtual:course-kit/server`, which holds the project root and
  is kept separate from `virtual:course-kit/data` so local paths never reach a browser bundle).
- `src/components/` — Astro components; `graph/GraphView.tsx` and `graph/RoadmapView.tsx` are React islands
  (@xyflow/react) rendered with `client:only="react"` plus a text fallback.
- `src/pages/` — generated pages. `src/styles/lab.css` — widget design tokens/primitives.
- `fixture/` — minimal course that builds the engine end to end (`bun run fixture:build`); not a package.
- `tests/` — `bun test` for the pure modules.

## Decisions and traps

- Config-side files are plain `.mjs` + JSDoc, never TS: astro.config is loaded by Node in CI, and Node refuses to
  strip types from files under node_modules. Locally `node` is Bun's wrapper, so this would not show up locally.
- Engine files are referenced by absolute paths (`own()` in index.mjs), not `course-kit/...` specifiers, so they
  resolve the same in a git install, a copy, or the fixture.
- The fixture has no package.json: it runs on this repo's devDependencies (one copy of astro/react).
  `file:..` from inside the repo makes Bun copy the repo into itself recursively (depth 50+; delete with
  `robocopy <empty> <dir> /MIR`). `astro preview --root fixture` fails (Starlight route resolution); serve `dist`
  statically instead.
- Layout uses @dagrejs/dagre, not elkjs: elkjs tests `typeof self` to detect a Web Worker, Bun defines `self`,
  so under Bun elkjs exports nothing.
- TypeScript is pinned to 6.0.x: @astrojs/check 0.9.10 peers on TS ^5 || ^6.
- Hierarchy edge types (`built-on`, `is-a`, `part-of`) must be acyclic as a UNION (genealogy walks them together).
- Storage keys are prefixed with course.json `id` (all courses share the `<user>.github.io` origin).
- Toolchain: bun 1.4.3.

## TODO

- [x] defineCourse, manifests + validation, links, generated pages, progress, quiz, term graph, MindMap, Roadmap
- [x] unit tests (manifests, links, graph queries), fixture build, astro-check clean
- [ ] Non-hierarchy edges (`related`, `uses`) can pass straight under a node in a vertical chain; route them
      around (side handles or bezier offset)
- [ ] Roadmap: verify sizing with a real many-module course (vulkan_en)
- [ ] CI: test + fixture build + check on push
- [ ] Course-wide quiz lint (vllm_en had tests/js/quiz-lint.test.ts): giveaway share via `correctIsLongest`
- [ ] Migration of vllm_en (progress keys were `vllm-course:` prefixed; its widgets) and math_en
