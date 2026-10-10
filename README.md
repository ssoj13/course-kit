# course-kit

The engine behind interactive [Starlight](https://starlight.astro.build) textbooks such as
[Vulkan from Zero](https://ssoj13.github.io/vulkan-course/). A course repository keeps only its content (MDX lessons,
its own widgets) and two JSON manifests. course-kit turns them into a full site:

- **Sidebar and numbering from `course.json`.** Modules and lessons get global numbers. Generated pages cover module
  overviews, the course roadmap, the glossary and a 404.
- **Links that fail the build.** `lesson:<slug>`, `page:<name>` and `term:<id>` resolve at build time, so a typo
  breaks the build instead of a page. The build also checks that every lesson in the manifest has a page.
- **Mind maps from one term graph, `terms.json`.** Every term has a one-line definition, and typed relations connect
  the terms (built on, a kind of, part of, uses, related). Lesson maps, genealogy ("down to the roots"), the full
  knowledge map and the glossary are all generated from it.
- **A node-editor look.** Foundations sit on top and rows read left to right in course order. Nodes are draggable and
  connected by smooth wires. Layout runs at build time with dagre, and the browser draws the graph with
  @xyflow/react.
- **Code from real files.** `<Snippet>` and `<CodeTabs>` cut `#region` blocks out of the course's example sources,
  so the code in the lessons is the code that compiles.
- **Progress and quizzes.** Progress is stored per browser and shown in the sidebar and on the roadmap, with
  export and import. Quizzes are validated at build time, including a limit on "the longest option is the answer".

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
});
```

Lessons live at `src/content/docs/<module>/<lesson>.mdx`. The course also needs the usual Starlight
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

<Quiz questions={[{ q: '...', options: ['a', 'b', 'c', 'd'], answer: 1, explain: '...' }]} />
```

Source files mark regions with line comments, `// #region setup` ... `// #endregion`, and the markers are never
shown.

## Develop

```sh
bun install
bun test tests          # unit tests: manifests, links, graph queries, regions
bun run check           # type check (engine + fixture)
bun run fixture:build   # build the small fixture course end to end
```

The `fixture/` course is the engine's end-to-end test and is not a package. Design decisions and traps are recorded
in [AGENTS.md](AGENTS.md).
