/**
 * Type declarations of the engine's plain-ESM modules (src/*.mjs: JS + JSDoc, see AGENTS.md) for courses that use
 * TypeScript. tsc emits `src/<name>.d.mts` next to each module (tsconfig.types.json), and TypeScript picks a sibling
 * `.d.mts` up by itself, for `course-kit/i18n.mjs` imports and the components' relative `../i18n.mjs` imports alike,
 * so the exports map needs no `types` conditions. The declarations are generated, never edited by hand.
 *
 *   bun scripts/types.ts            regenerate src/*.d.mts after changing a .mjs module
 *   bun scripts/types.ts --check    fail if they are stale (tests/types.test.ts runs the same comparison)
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const isDecl = (f: string) => f.endsWith('.d.mts');

/**
 * The declarations tsc emits now, by file name. They go to a temporary directory: writing over the existing siblings
 * fails (tsc reads them as inputs, TS5055), and having them as inputs does not change the output.
 */
export function emit(): Map<string, string> {
	const out = mkdtempSync(join(tmpdir(), 'course-kit-types-'));
	try {
		const r = Bun.spawnSync([process.execPath, 'x', 'tsc', '-p', 'tsconfig.types.json', '--outDir', out], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
		if (r.exitCode !== 0) throw new Error(`tsc failed:\n${r.stdout.toString()}${r.stderr.toString()}`);
		return new Map(readdirSync(out).map((f) => [f, readFileSync(join(out, f), 'utf8')]));
	} finally {
		rmSync(out, { recursive: true, force: true });
	}
}

/** Names of the committed declarations that differ from `fresh`, are missing, or have no module any more. */
export function stale(fresh: Map<string, string>): string[] {
	const committed = readdirSync(SRC).filter(isDecl);
	const changed = [...fresh].filter(([f, text]) => !committed.includes(f) || readFileSync(join(SRC, f), 'utf8') !== text).map(([f]) => f);
	return [...changed, ...committed.filter((f) => !fresh.has(f))];
}

if (import.meta.main) {
	const fresh = emit();
	if (process.argv.includes('--check')) {
		const bad = stale(fresh);
		if (bad.length) throw new Error(`stale declarations (run bun scripts/types.ts): ${bad.join(', ')}`);
	} else {
		for (const f of readdirSync(SRC).filter((f) => isDecl(f) && !fresh.has(f))) rmSync(join(SRC, f));
		for (const [f, text] of fresh) writeFileSync(join(SRC, f), text);
		console.log(`src: ${[...fresh.keys()].join(', ')}`);
	}
}
