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
  details-window placement), `trainer.ts` (pure trainer core, see "Trainers"), `store.ts`, `progress.ts`, `element.ts`
  (custom-element base), `ui.ts`, `quiz.ts`, `route-links.ts` (Starlight middleware), `regions.ts` (pure region
  extraction), `snippets.ts` (build-time file reads via `virtual:course-kit/server`, which holds the project root and
  is kept separate from `virtual:course-kit/data` so local paths never reach a browser bundle).
- `src/components/` — Astro components. React islands (`client:only="react"` plus a text fallback):
  `graph/TreeView.tsx` (concept trees: MindMap and course maps such as vulkan_en's ObjectGraph; see "Concept trees"),
  `graph/RoadmapView.tsx` (@xyflow/react, the roadmap page only; `graph.css`, `Frame.tsx`, `flow.ts`, `lib/fit.ts`),
  `trainer/Trainer.tsx` (exercises on a TreeView, used from a course island; `trainer.css`).
- `src/components/lab/` — lab primitives (React): `useTimeline.ts`, `Scrubber.tsx`, `LabFrame.tsx`, `lab.css`.
  `src/components/fullscreen.ts` — `useFullScreen()`, the one full-screen toggle of graph/Frame.tsx and LabFrame.
- `src/pages/` — generated pages. `src/styles/theme.css` — the color tokens (see "Theming"); `src/styles/lab.css` —
  widget primitives (its `--lab-*` colors alias the tokens).
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
hrefLabel}), `groups` ({id, label, color = a palette token, `groupColor(i)`}; order = sort,
spine and legend order), `label`, `reveal` (ids visible at start, or 'all'), `hint`, `prefer` (view before the
reader picks one), `cardClass` / `cardNote` / `renderDetails` (function props: only from another island, e.g. ObjectGraphView),
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
  muted with "lesson N" and their lesson link; groups = layers (layer i = palette entry `groupColor(i)`, see "Theming");
  `mode="all"` (roadmap page) is a forest that prefers the collapse view.
## Theming (v0.6.0, contract fixed in v0.7.0)

Every color of the engine's widgets is a `--ck-*` custom property defined ONCE in `src/styles/theme.css` (loaded first
through Starlight `customCss`, so the portal'd details window sees it too). Component CSS and TSX only read tokens;
a literal color anywhere else in `src/components` or `src/styles/lab.css` is a bug (the Starlight page chrome in
pages/*.astro, Quiz, CourseMap uses `--sl-color-*` directly and is not a widget).
- Surfaces/ink derive from Starlight (`--ck-frame`, `--ck-card`, `--ck-window`, `--ck-line`, `--ck-ink`, `--ck-ink-2`,
  `--ck-ink-muted`, `--ck-link`, `--ck-wire`, `--ck-accent`, `--ck-primary`/`--ck-on-primary`, `--ck-shadow`,
  `--ck-shadow-sm`), so light/dark need no second definition; feedback `--ck-ok/-warn/-err` switch to Starlight's
  `-high` shades in light (the plain ones are pastel, 1.8:1 on white). Card states: `--ck-selected`, `--ck-muted-bg/-ink`,
  `--ck-locked-bg/-ink`, `--ck-error`, `--ck-head-tint` / `--ck-done-tint` (share of the group color in a tinted card).
  `--ck-on-fill` = ink on a SOLID group/series/feedback fill (= `--sl-color-black`: near-black in dark, white in light,
  because the fills are light hues in dark and dark hues in light). `--ck-mono` = code font (Starlight's public
  `--sl-font-mono`, else `--sl-font-system-mono`; never the private `--__sl-font-mono`).
- Group palette `--ck-group-1..12` (dark + light values). Courses map their groups by index with `groupColor(i)`
  (TreeView.tsx, 0-based, wraps at `GROUP_COLORS` = 12): MindMap maps term layer i -> entry i; vulkan_en maps its 9
  object stages (ObjectGraph.astro `STAGE_COLOR`). lab.css `--lab-series-1..4` alias entries 8, 3, 5, 2 (blue, amber,
  purple, green).
- Light-only values sit under `:root:where([data-theme='light'])` = the specificity of `:root`. So a site theme is ONE
  `:root { }` block in the course's customCss (loaded after the engine's) and wins in both themes; a theme with
  different light values adds its own light block. Proof: fixture lab `theme` (`fixture/src/styles/high-contrast.css`
  via fixture `customCss`, scoped with `:root:where(:has(.fx-high-contrast))`, which adds no specificity; its
  `--ck-primary` is set only in the first block and is #ffd400 in light too, checked in headless Chrome 2026-10-11).
- Contrast (WCAG AA 4.5:1 for body text, measured in headless Chrome on the fixture and vulkan_en, 2026-10-11): every
  text of cards (all statuses), window, console, legend and toolbar passes in default dark, default light and the
  high-contrast override. Traps found: plain gray-3 is 4.49:1 on the dark frame (hence `--ck-ink-muted` = 50 % mix of
  gray-2 and gray-3; the sidebar overview links use it too, gray-3 was 4.47:1); muted ink on group-tinted cards drops
  to ~4.1:1 for the light hues, so secondary text on tinted cards (spine heads, done cards, card notes) uses
  `--ck-ink-2`; the dark accent under black text is 3.9:1 (hence `--ck-primary` = accent-high in dark); light palette
  entries are dark enough to be caption text on the frame (>= 4.76:1).

## Trainers (v0.6.0, API v0.7.0)

A trainer is a "build it yourself" exercise on a concept tree: the reader acts on cards (create, destroy, any verb)
or through global actions, rules refuse wrong actions with the quoted rule, the console logs everything, goals say
when it is done. The engine owns everything generic; a course supplies a scenario (data + rule functions) and the
tree items.
- Core `src/lib/trainer.ts` (pure, tests/trainer.test.ts):
  - `Scenario<S>` = `{ id, version, init, items, verbs(state, item), actions?(state), status(state, item),
    badge?(state, item), goals? }`. `version` = version of the rules/data (vulkan_en: a hash of its data files computed
    at build time); `items` = fixed ids or `(state) => ids` (instances that come and go); `actions` = global verbs
    (toolbar over the console), stored with item `GLOBAL` (''); `badge` = a short state word on the card and in the
    window (e.g. the current image layout). EVERY scenario function must be pure and deterministic: runs are rebuilt
    from the acts.
  - `Verb<S>` = `{ id, label, primary?, options?, check(state, opts) -> Failure[] (any failure refuses; Entry {kind,
    text, ref?}: ref = rule id, e.g. a VUID), apply(state, opts) -> {state, log} }`.
  - `VerbOption<S>` = `{ kind: 'flag', initial: boolean }` | `{ kind: 'choice', choices: {id, label}[], initial }` |
    `{ kind: 'number', min, max, step?, initial }` | `{ kind: 'item', of(state) -> ids }` (default = first candidate,
    '' = none: the verb's check refuses it when it needs one), each with `id`, `label`. `Opts` = `Record<string,
    boolean | number | string>`; `optOk(o, x, state)` validates per kind, `optsOf(v, state, given)` fills defaults.
  - `StaleAct` (Error subclass): thrown by `verbOf`/`optsOf`/`act` for an act that does not fit the scenario in that
    state (unknown item, verb not offered, option value refused). `replay` stops at it and catches NOTHING else (a
    throwing rule is a bug and propagates); the UI ignores a StaleAct of a queued click.
  - statuses `locked | ready | done | error`; status stays the scenario's own function. `consistency(sc, state)` lists
    disagreements with the main verb (locked must give a non-remark reason, ready must be accepted): courses assert
    it is empty over the states their tests reach.
  - A run is the list of acts: `act`, `replay`, `undo`, `why` (the main verb's failures of a locked item, remarks
    dropped), `goalsOf`/`complete`, `counts`, `itemsOf`, `allDone(label, ids?)` goal. Storage: `encode(sc, run)` =
    `{ v: 2, sv: version, acts }`; `decode(raw, version)` -> acts or null (other format, other version, bad shape).
- UI `src/components/trainer/Trainer.tsx`: renders the scenario on TreeView (all four views; card class `is-<status>`,
  styled in trainer.css; status word + badge on every card through TreeView `cardNote`, overridable `statusTag`), the
  window = course `body(item)` + status (`statusText` override) + badge + reasons + verbs (a verb with options = a
  `<fieldset>` with a visually hidden `<legend>`, its inputs and its button) + last result; under the map: global
  actions, progress (`progressText` override), goals, completion message, Undo / Start over (disabled without acts) /
  Restore (after Start over, until the next act), notice about a stale stored run, console. Live regions: the console
  (`aria-live=polite`) and one sr-only `role=status` (Undone / Started over / Restored / complete); the window's
  result is not live. `items` may be a function of the state.
- Persistence: per page and exercise (`trainerKey(location.pathname, scenario.id)`, store.ts guards blocked storage),
  written only after the reader acted; a changed key or scenario reloads its own run; a stored run of another
  version starts fresh with a visible notice, a partly stale one keeps the acts before the first stale act and says so.
- The engine never words subject matter: entries arrive as text in the reader's language; validation texts are passed
  verbatim (the course resolves them, e.g. vulkan_en `vuid()`).
- TreeView: Escape closes only this tree's window (key handler on the tree root, the window handles its own); on close
  focus goes to the card or, when it is hidden now, its nearest visible ancestor card.
- Fixture: `house` (flag option, refusals, broken parts, goal) and `boxes` (global action, number/choice/item options,
  items from the state, badge) on one page (`labs/trainer`): also checks that two trees keep separate windows.

### How to add a trainer (course side)

1. Model: a pure module with the subject's state and rules (vulkan_en: `src/lib/objects.ts`), tested on its own.
2. Scenario: a pure function `(ids, lang) => Scenario<S>` that wraps the model (vulkan_en: `src/lib/object-trainer.ts`):
   verb and option ids are stable (they are stored), `version` changes with the rules/data, `check` returns the
   refusals (VUID texts through the course's single source), `apply` the transition plus console lines, `status` maps
   the model onto the four statuses, `goals` say when it is done. Test it with the engine core (`act`/`replay`/`undo`/
   `why`/`complete`/`consistency`, stale runs) like tests/object-trainer.test.ts.
3. View: a React island (`client:only="react"`) builds `TreeItem`s/`TreeGroup`s (colors `groupColor(i)`), memoizes the
   scenario, and renders `<Trainer lang scenario items groups label body ... />`; an .astro wrapper validates data at
   build time and passes plain data (functions cannot cross the island boundary).
4. Texts: course-specific strings in the course's tables (EN + RU, parity tests); generic trainer chrome is the engine's.
5. Check: unit tests, `bun run check`, a browser pass (create/refuse/undo/reload restores the run), contrast if the
   course adds colors (it should not: use tokens).
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
- [x] Theming (v0.6.0): `--ck-*` tokens in styles/theme.css (one definition, light + dark, palette of 12), trees,
      window, roadmap and lab primitives on them; high-contrast override in the fixture; contrast measured (AA)
- [x] Trainers (v0.6.0): lib/trainer.ts core + tests, trainer/Trainer.tsx on TreeView, persistence per page, fixture lab
      `trainer` (toy house scenario, also the core's test subject); vulkan_en ObjectGraph build mode ported
- [x] Trainers API v0.7.0 (review of v0.6.0): StaleAct, scenario version, option kinds, global actions, items from the
      state, badge, consistency(), single live console + status, Restore, scoped Escape, theme contract with one :root
- [ ] Trainers: next scenarios in vulkan_en (frame assembly with fences/semaphores, barriers, image layouts, descriptor
      wiring, pipeline creation); if one needs a non-tree board (timeline lanes), extend Trainer with a second view
      instead of forking it
- [ ] Migration of vllm_en (progress keys were `vllm-course:` prefixed; its widgets) and math_en
