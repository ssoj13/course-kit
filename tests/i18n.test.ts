import { describe, expect, test } from 'bun:test';
import { checkCourse, checkTerms, edgeKey, localizeCourse, localizeTerms } from '../src/data.mjs';
import { langOfFile, makeResolver } from '../src/links.mjs';
import { UI, fmt, ui } from '../src/i18n.mjs';
import { correctIsLongest, questionErrors, type Question } from '../src/lib/quiz';

const course = checkCourse({
	id: 'demo',
	title: 'Demo',
	description: 'Demo course.',
	modules: [{ slug: 'm1', title: 'One', summary: 'First.', lessons: [{ slug: 'a', title: 'A', summary: 'a' }] }],
});
const terms = checkTerms(
	{
		layers: [{ id: 'top', label: 'Top' }],
		terms: [
			{ id: 'x', label: 'X', layer: 'top', def: 'x', lesson: 'a' },
			{ id: 'y', label: 'Y', layer: 'top', def: 'y' },
		],
		edges: [{ from: 'x', to: 'y', type: 'built-on', label: 'needs' }],
	},
	course,
);
const courseRu = {
	title: 'Демо',
	description: 'Демо-курс.',
	modules: { m1: { title: 'Первый', summary: 'Первый.', lessons: { a: { title: 'А', summary: 'а' } } } },
};
const termsRu = {
	layers: { top: 'Верх' },
	terms: { x: { label: 'Икс', def: 'икс' }, y: { label: 'Игрек', def: 'игрек' } },
	edges: { 'x|built-on|y': 'нуждается в' },
};

describe('translation overlays', () => {
	test('a complete overlay keeps structure and replaces texts', () => {
		const c = localizeCourse(structuredClone(courseRu), course, 'ru');
		expect(c.modules[0]!.lessons[0]).toEqual({ slug: 'a', title: 'А', summary: 'а' });
		const t = localizeTerms(structuredClone(termsRu), terms, 'ru');
		expect(t.terms.map((x) => x.label)).toEqual(['Икс', 'Игрек']);
		expect(t.terms[0]!.lesson).toBe('a');
		expect(t.edges[0]!.label).toBe('нуждается в');
	});
	test('missing and unknown keys fail the build', () => {
		const bad = structuredClone(courseRu) as any;
		delete bad.modules.m1.lessons.a;
		bad.modules.m2 = { title: 'x', summary: 'x', lessons: {} };
		expect(() => localizeCourse(bad, course, 'ru')).toThrow(/lessons: missing "a"[\s\S]*modules: unknown "m2"|modules: unknown "m2"[\s\S]*missing "a"/);
		const badT = structuredClone(termsRu) as any;
		delete badT.edges[edgeKey({ from: 'x', type: 'built-on', to: 'y' })];
		expect(() => localizeTerms(badT, terms, 'ru')).toThrow(/edges: missing "x\|built-on\|y"/);
	});
});

describe('language of a docs file and its links', () => {
	test('langOfFile', () => {
		expect(langOfFile('file:///C:/c/src/content/docs/ru/m1/a.mdx', ['ru'], 'en')).toBe('ru');
		expect(langOfFile('C:\\c\\src\\content\\docs\\m1\\a.mdx', ['ru'], 'en')).toBe('en');
		expect(langOfFile('/c/src/content/docs/rust/a.mdx', ['ru'], 'en')).toBe('en');
	});
	test('links stay in the language of the page', () => {
		const ru = makeResolver(course, terms, {}, '/base', '/ru');
		expect(ru('lesson:a')).toBe('/base/ru/m1/a/');
		expect(ru('page:home')).toBe('/base/ru/');
		expect(ru('term:x')).toBe('/base/ru/glossary/#term-x');
	});
});

describe('interface texts', () => {
	test('every language has exactly the keys of English', () => {
		const en = Object.keys(UI.en).sort();
		for (const [lang, t] of Object.entries(UI)) expect(Object.keys(t).sort(), lang).toEqual(en);
	});
	test('placeholders survive translation', () => {
		const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
		for (const [lang, t] of Object.entries(UI)) {
			for (const [k, v] of Object.entries(t)) expect(names(v), `${lang}.${k}`).toEqual(names(UI.en[k as keyof typeof UI.en]));
		}
	});
	test('ui() refuses unknown languages, fmt fills placeholders', () => {
		expect(() => ui('xx')).toThrow(/no interface texts for "xx"/);
		expect(fmt('{a}/{b}', { a: 1, b: 2 })).toBe('1/2');
	});
});

describe('quiz model', () => {
	const q: Question = {
		q: 'Q?',
		options: [
			{ text: 'right one', why: 'because' },
			{ text: 'wrong option', why: 'no' },
			{ text: 'other wrong', why: 'no' },
			{ text: 'third', why: 'no' },
		],
		answer: 0,
		ref: '#section',
	};
	test('a complete question is valid', () => {
		expect(questionErrors(q)).toEqual([]);
	});
	test('every option needs a why, and a ref is required', () => {
		const bad = structuredClone(q) as any;
		bad.options[2].why = '';
		bad.ref = 'section';
		expect(questionErrors(bad).join('; ')).toMatch(/option 3: empty `why`.*`ref` must be/);
	});
	test('longest-option giveaway is measured on option texts', () => {
		expect(correctIsLongest(q)).toBe(false);
		expect(correctIsLongest({ ...q, answer: 1 })).toBe(true);
	});
});
