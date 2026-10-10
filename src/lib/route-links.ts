/**
 * Starlight route middleware, two fixes to the route data:
 * 1. Frontmatter is not processed by the Markdown pipeline, so `lesson:`/`page:`/`term:` links in hero actions
 *    are resolved here with the same resolver as the Markdown plugin.
 * 2. Lesson pages get prev/next links in COURSE order (course.json). The stock links follow the sidebar,
 *    which would send the first lesson back to the roadmap and the last one on to the Reference group.
 */
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { adjacent, href, lessonByPath, resolveLink, type Lesson } from './course';

const link = (l?: Lesson) =>
	l && ({ type: 'link', label: `${l.num}. ${l.label}`, href: href(l.slug), isCurrent: false, badge: undefined, attrs: {} } as const);

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	for (const action of route.entry.data.hero?.actions ?? []) {
		action.link = resolveLink(action.link, route.entry.id) ?? action.link;
	}
	const lesson = lessonByPath(route.id);
	if (lesson) {
		const { prev, next } = adjacent(lesson.slug);
		route.pagination = { prev: link(prev), next: link(next) };
	}
});
