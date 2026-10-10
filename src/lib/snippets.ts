/**
 * Loads code shown in lessons from the course's real source files (server/build time only).
 * `src` is `path/from/project/root.ext#region`; without `#region` the whole file is used.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from 'virtual:course-kit/server';
import { extractRegion, stripMarkers } from './regions';

/** File extension -> Expressive Code language id. */
const LANGS: Record<string, string> = {
	rs: 'rust',
	cpp: 'cpp',
	cc: 'cpp',
	hpp: 'cpp',
	h: 'c',
	c: 'c',
	slang: 'hlsl', // Slang is HLSL-like; Shiki has no Slang grammar
	hlsl: 'hlsl',
	glsl: 'glsl',
	vert: 'glsl',
	frag: 'glsl',
	comp: 'glsl',
	toml: 'toml',
	json: 'json',
	cmake: 'cmake',
	txt: 'text',
	py: 'python',
	ts: 'ts',
};

export interface Snippet {
	code: string;
	lang: string;
	/** Path from the project root, shown as the code block title. */
	file: string;
	region?: string;
}

export function loadSnippet(src: string): Snippet {
	const [file, region] = src.split('#') as [string, string | undefined];
	let text: string;
	try {
		text = readFileSync(join(root, file), 'utf8');
	} catch (e) {
		throw new Error(`snippet "${src}": cannot read ${file} (${e instanceof Error ? e.message : e})`);
	}
	const base = file.split('/').pop() ?? file;
	const ext = base === 'CMakeLists.txt' ? 'cmake' : (base.split('.').pop() ?? '');
	const lang = LANGS[ext];
	if (!lang) throw new Error(`snippet "${src}": unknown language for ".${ext}" (add it to LANGS in lib/snippets.ts)`);
	const code = region ? extractRegion(text, region, file) : stripMarkers(text);
	return { code, lang, file, region };
}
