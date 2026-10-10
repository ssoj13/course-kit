/**
 * Named regions of source files, so lessons show code that really compiles: the example sources carry
 * `#region <name>` / `#endregion` marker comments (the VS Code convention, any line-comment syntax), and
 * <Code region> extracts one region at build time. A missing or unclosed region fails the build.
 */

/** A marker line: optional indent, a line comment (`//`, `#`, `--`, `;`), then `#region name` / `#endregion [name]`. */
const MARKER = /^\s*(?:\/\/|#|--|;)\s*#(region|endregion)\b\s*([\w.-]*)\s*$/;

/**
 * Text of region `name` in `source`, without marker lines (also of nested regions) and with the common
 * indentation removed. Throws when the region is missing, duplicated or not closed.
 */
export function extractRegion(source: string, name: string, where = 'source'): string {
	const lines = source.split(/\r?\n/);
	let start = -1;
	let depth = 0;
	const out: string[] = [];
	for (const [i, line] of lines.entries()) {
		const m = MARKER.exec(line);
		if (start < 0) {
			if (m?.[1] === 'region' && m[2] === name) start = i;
			continue;
		}
		if (m?.[1] === 'region') {
			if (m[2] === name) throw new Error(`${where}: region "${name}" is opened twice (line ${i + 1})`);
			depth++;
			continue;
		}
		if (m?.[1] === 'endregion') {
			if (depth === 0) return dedent(out);
			depth--;
			continue;
		}
		out.push(line);
	}
	throw new Error(start < 0 ? `${where}: no region "${name}"` : `${where}: region "${name}" is not closed`);
}

/** The whole source without region marker lines (for showing a complete file), dedented. */
export function stripMarkers(source: string): string {
	return dedent(source.split(/\r?\n/).filter((l) => !MARKER.test(l)));
}

/** Removes the indentation shared by all non-blank lines, and blank lines at both ends. */
export function dedent(lines: readonly string[]): string {
	let a = 0;
	let b = lines.length;
	while (a < b && !lines[a]!.trim()) a++;
	while (b > a && !lines[b - 1]!.trim()) b--;
	const body = lines.slice(a, b);
	const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
	return body.map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length))).join('\n');
}
