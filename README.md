# course-kit

The engine behind interactive [Starlight](https://starlight.astro.build) textbooks such as
[Vulkan from Zero](https://ssoj13.github.io/vulkan-course/). A course repository keeps only its content (MDX lessons,
its own widgets) and two JSON manifests. course-kit turns them into a full site:

- **Sidebar and numbering from `course.json`.** Modules and lessons get global numbers. Generated pages cover module
  overviews, the course roadmap, the glossary and a 404.
- **Links that fail the build.** `lesson:<slug>`, `lab:<slug>`, `page:<name>` and `term:<id>` resolve at build time,
  so a typo breaks the build instead of a page. The build also checks that every lesson and lab in the manifest has
  a page.
- **Mind maps from one term graph, `terms.json`.** Every term has a one-line definition, and typed relations connect
  the terms (built on, a kind of, part of, uses, related). Lesson maps, genealogy ("down to the roots"), the full
  knowledge map and the glossary are all generated from it.
- **Concept trees.** Every map is a tree: each term hangs off the term it is built on, other relations are dashed
  wires or notes. The reader picks the view: a roadmap.sh-style spine, a collapsible tree, the full tree or an
  outline. Details open in a floating window that never moves the map. The roadmap is a react-flow graph.
- **Code from real files.** `<Snippet>` and `<CodeTabs>` cut `#region` blocks out of the course's example sources,
  so the code in the lessons is the code that compiles.
- **Several languages.** The first language is served at the base path, the others under `/<code>/`, with
  Starlight's language switcher. Each extra language has translation overlays next to the manifests, and the
  build fails if any of them is incomplete. Links, sidebar, generated pages and the engine's interface follow the
  page's language.
- **Progress and quizzes.** Progress is stored per browser and shared by all languages. It shows in the sidebar
  and on the roadmap, with export and import. A quiz grades the moment an option is picked: the option flashes,
  the reader gets the reason why it is right or wrong, and a link to the section that explains it. Quizzes are
  validated at build time, including dead section links and a limit on answers that option length gives away (the longest or the shortest option is the answer).

- **Labs.** Interactive simulations get their own pages, a generated catalog, a sidebar group, `lab:` links and a box on
  the lesson they belong to. Generic React primitives cover the scrubbable timeline every lab is built on.

## Use it in a course

```sh
bun add github:ssoj13/course-kit#v0.2.0 astro @astrojs/starlight @astrojs/react @astrojs/markdown-satteri react react-dom
```

```js
// astro.config.mjs
import { defineCourse } from 'course-kit';

export default defineCourse({
	site: 'https://<user>.github.io',
	base: '/<repo>',
	repo: 'https://github.com/<user>/<repo>',
	course: new URL('./src/data/course.json', import.meta.url),
	terms: new URL('./src/data/terms.json', import.meta.url),
	languages: [{ code: 'en', label: 'English' }, { code: 'ru', label: 'Русский' }], // optional, default English only
});
```

Lessons live at `src/content/docs/<module>/<lesson>.mdx`. Lessons in another language live at
`src/content/docs/<code>/<module>/<lesson>.mdx`, and every language needs its own `index.mdx`. The course also needs the usual Starlight
`src/content.config.ts` (docs and i18n collections) and `src/content/i18n/en.json` (`{}`).

### course.json

```json
{
  "id": "my-course",
  "title": "My Course",
  "description": "One sentence for search engines and the home page.",
  "modules": [
    {
      "slug": "basics",
      "title": "Basics",
      "summary": "What this module covers.",
      "lessons": [{ "slug": "first", "title": "The first lesson", "short": "First", "summary": "What it covers." }]
    }
  ]
}
```

`id` namespaces browser storage, and lesson slugs are unique across the course. `short` is an optional sidebar
label.

### terms.json

```json
{
  "layers": [{ "id": "concept", "label": "Concept" }, { "id": "hardware", "label": "Hardware" }],
  "terms": [
    { "id": "gpu", "label": "GPU", "layer": "hardware", "lesson": "first", "def": "A processor with thousands of simple cores." },
    { "id": "shader", "label": "Shader", "layer": "concept", "lesson": "first", "def": "A small program the GPU runs for many items at once." }
  ],
  "edges": [{ "from": "shader", "to": "gpu", "type": "built-on", "label": "runs on" }]
}
```

- **`layers`** form the depth stack, ordered from abstract to hardware; a term's layer sets its color.
- **`edges`** read as "`from` *is built on* `to`". The types are `built-on`, `is-a`, `part-of`, `uses` and
  `related`. The first three are hierarchy edges, and their union must be acyclic.

### Translations

Every language after the first has two overlays next to the manifests: `course.<code>.json` and
`terms.<code>.json`. They contain only texts, keyed by the default manifests' slugs and ids. Order, slugs and
relations exist in one place.

```json
// course.ru.json
{ "title": "…", "description": "…", "modules": { "basics": { "title": "…", "summary": "…", "lessons": { "first": { "title": "…", "summary": "…" } } } } }
// terms.ru.json
{ "layers": { "concept": "…" }, "terms": { "gpu": { "label": "…", "def": "…" } }, "edges": { "shader|built-on|gpu": "…" } }
```

A missing or unknown key fails the build. Engine interface texts for a new language go into `src/i18n.mjs`.

### In MDX

```mdx
import MindMap from 'course-kit/components/MindMap.astro';
import Term from 'course-kit/components/Term.astro';
import Quiz from 'course-kit/components/Quiz.astro';
import CodeTabs from 'course-kit/components/CodeTabs.astro';

Read [the next lesson](lesson:second), the [roadmap](page:roadmap) or about <Term id="gpu" />.

<MindMap />                                  {/* this lesson's terms and their neighbours */}
<MindMap term="shader" mode="genealogy" />   {/* everything it is built on */}

<CodeTabs items={{ Rust: 'examples/demo.rs#setup', 'C++': 'examples/demo.cpp#setup' }} />

<Quiz questions={[{
  q: 'What does a GPU run for every pixel?',
  options: [
    { text: 'A shader', why: 'One small program, run for many items at once.' },
    { text: 'A driver', why: 'The driver runs on the CPU and prepares work; it is not run per pixel.' },
    { text: 'A queue', why: 'A queue holds submitted work; it is not a program.' },
    { text: 'The loader', why: 'The loader routes API calls on the CPU.' },
  ],
  answer: 0,
  ref: '#shaders',          // a heading of this page, or lesson:slug#anchor
}]} />
```

Source files mark regions with line comments, `// #region setup` ... `// #endregion`, and the markers are never
shown.

### Labs

A lab is an interactive simulation with a page of its own. Labs are listed in `course.json`, in catalog order:

```json
"labs": [
  { "slug": "frames-in-flight", "title": "Frames in flight", "summary": "CPU and GPU lanes, fences, semaphores.", "lesson": "sync-basics" }
]
```

- `lesson` is the slug of the lesson the lab belongs to. Leave it out for a lab that previews later material.
- Lab slugs are kebab-case and unique among labs. No module may be named `labs`.
- Every language needs a page `src/content/docs/[<code>/]labs/<slug>.mdx`. A missing page fails the build.
- Overlays translate labs with `"labs": { "<slug>": { "title": "…", "summary": "…" } }`. When the course has labs,
  every lab needs an entry.

What the engine generates from that list:

- a catalog at `/labs/` (`page:labs`): labs grouped by the module of their lesson, in course order, and labs without
  a lesson in a last group, "Ahead in the course";
- a sidebar group "Labs" between the modules and "Reference", with "All labs" first and then every lab;
- `lab:<slug>[#anchor]` links in Markdown, which stay in the page's language and fail the build on an unknown slug;
- a "Labs for this lesson" box at the end of each lesson that has labs, and a "Lab · Lesson N — title" eyebrow on
  every lab page.

Components read the same data through `courseIn(lang)` (`lib/course.ts`): `labs`, `labHref(slug)`,
`labsOf(lessonSlug)` and `labByPath(path)`.

A lab precomputes its simulation as an array of frames, one state per step. The controls then only move an index
over that array, so stepping back is exact. The engine provides three React primitives for this:

- `useTimeline(frames, { ms?, autoplay? })` (`components/lab/useTimeline.ts`) returns
  `{ index, frame, count, step(d), seek(i), play(), pause(), playing, reset() }`. Playback shows each frame for `ms`
  (default 900) and stops on the last one. A manual move pauses it. `autoplay` is skipped under
  prefers-reduced-motion. The index rules live in `lib/timeline.ts` and are unit-tested.
- `<Scrubber lang tl caption? />` (`components/lab/Scrubber.tsx`) draws the controls: back to the start, step back,
  play/pause, step forward, a slider, "Step i of n" and the caption. With focus on the controls, ← and → step and
  Space plays or pauses.
- `<LabFrame lang title? onReset?>` (`components/lab/LabFrame.tsx`) is the card around a lab. It has an optional
  title, a reset button when `onReset` is given, and the same full-screen toggle as the graphs (Esc closes it).

```tsx
// src/components/CounterLab.tsx (course side)
import { LabFrame } from 'course-kit/components/lab/LabFrame.tsx';
import { Scrubber } from 'course-kit/components/lab/Scrubber.tsx';
import { useTimeline } from 'course-kit/components/lab/useTimeline.ts';

export default function CounterLab({ lang, captions }: { lang: string; captions: string[] }) {
  const tl = useTimeline(captions);
  return (
    <LabFrame lang={lang} title="Counter" onReset={tl.reset}>
      <p>{tl.index}</p>
      <Scrubber lang={lang} tl={tl} caption={tl.frame} />
    </LabFrame>
  );
}
```

```mdx
{/* src/content/docs/labs/counter.mdx */}
import CounterLab from '../../../components/CounterLab.tsx';

<CounterLab client:load lang="en" captions={['Zero.', 'One.', 'Two.']} />
```

## Develop

```sh
bun install
bun test tests          # unit tests: manifests, links, graph queries, regions, timeline
bun run check           # type check (engine + fixture)
bun run fixture:build   # build the small fixture course end to end
```

The `fixture/` course is the engine's end-to-end test and is not a package. Design decisions and traps are recorded
in [AGENTS.md](AGENTS.md).
