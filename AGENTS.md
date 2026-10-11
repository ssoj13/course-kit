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
Links in Markdown: `lesson:<slug>[#a]`, `lab:<slug>[#a]`, `page:<roadmap|glossary|home|labs|course pages>`, `term:<id>`.

## Layout

- `src/index.mjs` — `defineCourse()`: validates manifests, builds the Astro config, `virtual:course-kit/data`,
  injects pages (`/[module]`, `/roadmap`, `/glossary`, `/404`), checks every lesson has a page.
- `src/data.mjs` — manifest types (JSDoc) and validation; `src/links.mjs` — course link resolver + Markdown plugin.
- `src/lib/` (TS, Vite side): `course.ts` (numbering/URLs), `graph.ts` (pure term-graph queries), `terms.ts`
  (binds graph.ts to the course), `tree.ts` (pure concept-tree model: forest, primary parents, tidy layout, spine,
  details-window placement), `store.ts`, `progress.ts`, `element.ts`
  (custom-element base), `ui.ts`, `quiz.ts`, `route-links.ts` (Starlight middleware), `regions.ts` (pure region
  extraction), `snippets.ts` (build-time file reads via `virtual:course-kit/server`, which holds the project root and
  is kept separate from `virtual:course-kit/data` so local paths never reach a browser bundle).
- `src/components/` — Astro components. React islands (`client:only="react"` plus a text fallback):
  `graph/TreeView.tsx` (concept trees: MindMap and course maps such as vulkan_en's ObjectGraph; see "Concept trees"),
  `graph/RoadmapView.tsx` (@xyflow/react, the roadmap page only; `graph.css`, `Frame.tsx`, `flow.ts`, `lib/fit.ts`).
- `src/components/lab/` — lab primitives (React): `useTimeline.ts`, `Scrubber.tsx`, `LabFrame.tsx`, `lab.css`.
  `src/components/fullscreen.ts` — `useFullScreen()`, the one full-screen toggle of graph/Frame.tsx and LabFrame.
- `src/pages/` — generated pages. `src/styles/lab.css` — widget design tokens/primitives.
- `fixture/` — minimal course that builds the engine end to end (`bun run fixture:build`); not a package.
- `tests/` — `bun test` for the pure modules.

## Decisions and traps

- Config-side files are plain `.mjs` + JSDoc, never TS: astro.config is loaded by Node in CI, and Node refuses to
  strip types from files under node_modules. Locally `node` is Bun's wrapper, so this would not show up locally.
- Types of those `.mjs` modules for TypeScript courses: generated `src/<name>.d.mts` siblings (`bun run types` =
  scripts/types.ts over tsconfig.types.json; tests/types.test.ts fails when they are stale). TS picks a sibling
  `.d.mts` by itself (package imports and the components' relative `../i18n.mjs` alike), so exports need no `types`
  conditions. tsconfig.json excludes `src/*.d.mts`: if they were included, TS would drop the `.mjs` twins from the
  program and stop checking them. Emit goes through a temp dir: tsc refuses to overwrite its own inputs (TS5055).
- Engine files are referenced by absolute paths (`own()` in index.mjs), not `course-kit/...` specifiers, so they
  resolve the same in a git install, a copy, or the fixture.
- The fixture has no package.json: it runs on this repo's devDependencies (one copy of astro/react).
  `file:..` from inside the repo makes Bun copy the repo into itself recursively (depth 50+; delete with
  `robocopy <empty> <dir> /MIR`). `astro preview --root fixture` fails (Starlight route resolution); serve `dist`
  statically instead.
- No graph-layout library: concept maps are trees laid out by lib/tree.ts (dagre was removed in v0.5.0 with the
  react-flow mind maps). If a layered layout is ever needed again: elkjs exports nothing under Bun (it tests
  `typeof self`); dagre worked.
- TypeScript is pinned to 6.0.x: @astrojs/check 0.9.10 peers on TS ^5 || ^6.
- Hierarchy edge types (`built-on`, `is-a`, `part-of`) must be acyclic as a UNION (genealogy walks them together).
- Storage keys are prefixed with course.json `id` (all courses share the `<user>.github.io` origin).
- Toolchain: bun 1.4.3.

## Languages (i18n)

- `defineCourse({ languages })`: first = default at the base path, others under `/<code>/` (Starlight locales,
  `root` + codes). Overlays `course.<code>.json` / `terms.<code>.json` (data.mjs `localizeCourse/localizeTerms`):
  texts only, keyed by slugs/ids, must be complete. Every language needs all lesson pages + `index.mdx`.
- Engine interface texts: `src/i18n.mjs` (one table, tests enforce equal key sets and placeholders).
- Language of a page = its URL (`langOf` in lib/course.ts); `courseIn(lang)` gives the course view (numbers, URLs,
  texts, resolver); `graphIn(lang)` the term graph. Islands get `lang` as a prop; custom-element scripts get their
  texts through `data-i18n` (LabElement `text()`).
- Markdown links: the plugin picks the resolver by the file path (`content/docs/<code>/`).
- Generated pages are injected once per language with the same entrypoint; one 404 (default language + links).
- Progress keys are lesson slugs: shared by all languages.

## Concept trees (v0.5.0)

User-approved design (2026-10-11, gallery "D+E" + roadmap.sh): every concept map is a TREE. `TreeView` props:
`items` ({id, label, def, group, parent, rel, relUp, extra[{id, rel, note}], code, sub, muted, facts, href,
hrefLabel}), `groups` ({id, label, color = any CSS color, usually a theme-aware custom property}; order = sort,
spine and legend order), `label`, `reveal` (ids visible at start, or 'all'), `hint`, `prefer` (view before the
reader picks one), `cardClass` / `renderDetails` (function props: only from another island, e.g. ObjectGraphView),
`children` (rendered inside the frame under the legend).
- Views, chosen by the reader and remembered for the whole site (store key `tree-view`): `spine` (DEFAULT_MODE,
  roadmap.sh: a spine node at every group change, same-group descendants beside it, left/right balanced, one column
  under 40rem via a container query), `collapse` (tidy tree left to right, round toggle = hidden-children count,
  "−" when open), `tree` (all open, no toggles), `outline` (indented list, shares the open set with collapse).
- One primary parent per node (solid elbow connector, trunks aligned on column edges, relation label measured and
  given room in the column gap). Other parents: dashed bezier wire under the cards when both ends are visible,
  else a "+ from X" / "+ <rel> X" line on the card. A card that is the second parent of more than FAN = 2 visible
  cards (hubs such as "Vulkan object") is wired only while one end is selected; the cards carry the "+" note.
- Details: `DetailsWindow.tsx`, a floating non-modal window in a portal (fixed elements inside the page could be
  trapped by containment): opens at the right side avoiding the node, draggable by the title bar, CSS-resizable,
  geometry remembered (store key `tree-window`), Escape/X close and focus returns to the card, bottom sheet under
  640 px. Clicking another card swaps the content. Placement math: `placeWindow`/`clampRect` (tested).
- Measuring: cards are measured after every render (offset reads; state bump only on change) plus a ResizeObserver
  (fonts). Tree cards are `width: max-content` capped by `max-width` (absolute boxes would shrink to the canvas).
  API names break only between words (`<wbr>`).
- MindMap: lesson mode adds a "Lesson N: title" root; primary parent = strongest relation (built-on > part-of >
  is-a > uses > related) via `pickParents` (cycle-safe: uses/related are not acyclic); terms of other lessons are
  muted with "lesson N" and their lesson link; groups = layers (`--ck-l0..5` in tree.css, light + dark);
  `mode="all"` (roadmap page) is a forest that prefers the collapse view.
## Quiz model

`{ q, options: [{ text, why }] x4, answer, ref }`: grading on click, shared `flash()` (lab.css: 1 s in, 5 s out),
the picked option's `why` (and the right one's after a wrong pick), "read again" link from `ref` (`#anchor` is
checked against the page headings at build time). No separate `explain`: the right option's `why` is it.
Rules: `quizErrors(questions)` in lib/quiz.ts is the single rule set (Quiz.astro at build time, course lints):
structure per question, and each length strategy ("pick the longest" / "pick the shortest", `lengthGuess`) may
find at most `giveawayLimit` = floor(n/3), min 1, answers per quiz.

## Labs (v0.4.0)

- Manifest: course.json `labs: [{ slug, title, summary, lesson? }]` (catalog order; `lesson` optional = previews
  later material). Lab slugs are their own namespace; `labs` is a reserved module slug. Overlay `labs: { slug: {
  title, summary } }`, complete when the course has labs, absent otherwise (data.mjs `checkCourse`/`localizeCourse`).
- Pages: `content/docs/[<code>/]labs/<slug>.mdx` (checked by `checkLessonFiles`); `/labs` catalog injected per language
  only when the course has labs (`pages/labs.astro`); sidebar group between modules and Reference ("All labs" reuses
  the `module-overview-link` style); `lab:` links and `page:labs` exist only with labs (links.mjs).
- Views: `CourseView.labs`, `labByPath`, `labHref`, `labsOf` (lib/course.ts; one `norm()` for lesson and lab paths).
  Lesson box in the Footer override (next to LessonDone); lab eyebrow in the PageTitle override. Lab pages keep the
  stock prev/next (sidebar order: All labs -> labs -> Glossary); only lessons are re-paginated.
- Primitives: a lab is an array of precomputed frames; `lib/timeline.ts` holds the pure index rules (tested),
  `useTimeline` binds them (one setTimeout per frame, manual moves pause, autoplay off under reduced motion).
  Scrubber end buttons are `aria-disabled`, not `disabled`, so keyboard focus survives reaching an end.
- Fixture: labs `counter` (lesson one, `fixture/src/components/CounterLab.tsx`) and `preview` (no lesson, exercises
  the "Ahead in the course" group).

## TODO

- [x] defineCourse, manifests + validation, links, generated pages, progress, quiz, term graph, MindMap, Roadmap
- [x] unit tests (manifests, links, graph queries), fixture build, astro-check clean
- [x] Non-hierarchy edges crossing the map: obsolete since v0.5.0 (concept trees; second relations are dashed wires
      under the cards or "+" notes, hubs wired only on selection)
- [ ] Roadmap: verify sizing with a real many-module course (vulkan_en)
- [x] CI: test + fixture build + check on push (green on ubuntu, real Node: the .mjs config side works)
- [x] Graph readability: `lib/fit.ts` (FIT_ZOOM 0.75-1.2, alignTop: start at the root), `canvasHeight()` in
      layout.ts, `graph/Frame.tsx` full-screen toggle, layout edges accept `minlen`
- [x] One reading order everywhere (user, 2026-10-10: "слева направо сверху вниз"): foundations/roots on top, wires
      run down, rows left to right in course order (lib/layout.ts: links source-above-target + per-row dagre
      order constraints from a first pass). Roadmap is a file-tree (modules on a left spine, lessons indented).
- [x] Node-editor look (graph.css): cards with colored title bar + ports, bezier wires, selected node's wires lit,
      secondary relations faint; nodes draggable (`graph/flow.ts` useFlowNodes keeps drags across data updates,
      Frame "Reset layout"); edge labels live in the info panel, not on the canvas.
- [x] Course-wide quiz lint: courses call `quizErrors` (vulkan_en scripts/lint-content.ts); longest AND shortest
      giveaways limited (v0.3.2)
- [x] Declarations for the `.mjs` modules (v0.4.1): courses type-check `course-kit` and `course-kit/i18n.mjs`
- [x] Labs as a first-class part (v0.4.0): manifest, pages, catalog, sidebar, `lab:` links, lesson box, eyebrow,
      timeline primitives (useTimeline, Scrubber, LabFrame)
- [ ] Labs: verify Scrubber/LabFrame interaction in a real browser (keyboard, play to the end, full screen); only the
      SSR output was checked so far
- [x] Concept trees (v0.5.0): TreeView (spine / collapse / tree / outline), DetailsWindow, lib/tree.ts + tests;
      MindMap on the tree; GraphView, lib/layout.ts and dagre removed; the roadmap stays react-flow
- [ ] Concept trees: a reader-facing check of keyboard use in a real (non-headless) browser and of the window resize
      handle on touch devices (headless Chrome verified click, Create, swap, Escape, focus return in all four views)
- [ ] Migration of vllm_en (progress keys were `vllm-course:` prefixed; its widgets) and math_en
