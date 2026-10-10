import { describe, expect, test } from 'bun:test';
import { dedent, extractRegion, stripMarkers } from '../src/lib/regions';

const src = ['fn f() {', '    // #region a', '    let x = 1;', '    // #region b', '    let y = 2;', '    // #endregion b', '    // #endregion', '}'].join('\n');

describe('extractRegion', () => {
	test('strips nested markers and common indent', () => {
		expect(extractRegion(src, 'a')).toBe('let x = 1;\nlet y = 2;');
		expect(extractRegion(src, 'b')).toBe('let y = 2;');
	});
	test('other comment styles', () => {
		expect(extractRegion('# #region r\nx = 1\n# #endregion', 'r')).toBe('x = 1');
	});
	test('missing and unclosed regions fail with the file name', () => {
		expect(() => extractRegion(src, 'nope', 'f.rs')).toThrow('f.rs: no region "nope"');
		expect(() => extractRegion('// #region a\nx', 'a', 'f.rs')).toThrow('f.rs: region "a" is not closed');
	});
});

test('stripMarkers keeps code, drops every marker line', () => {
	expect(stripMarkers(src)).toBe('fn f() {\n    let x = 1;\n    let y = 2;\n}');
});

test('dedent trims blank edges', () => {
	expect(dedent(['', '  a', '    b', ''])).toBe('a\n  b');
});
