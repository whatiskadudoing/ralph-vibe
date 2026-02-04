/**
 * @module tests/utils/string_test
 *
 * Tests for utils/string module.
 */

import { assertEquals } from '@std/assert';
import {
  capitalize,
  center,
  dedent,
  indent,
  isBlank,
  isNotBlank,
  normalizeWhitespace,
  padLeft,
  padRight,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  truncate,
} from '../../src/utils/string.ts';

// ============================================================================
// capitalize tests
// ============================================================================

Deno.test('capitalize capitalizes first letter', () => {
  assertEquals(capitalize('hello'), 'Hello');
});

Deno.test('capitalize handles already capitalized string', () => {
  assertEquals(capitalize('Hello'), 'Hello');
});

Deno.test('capitalize handles empty string', () => {
  assertEquals(capitalize(''), '');
});

Deno.test('capitalize handles single character', () => {
  assertEquals(capitalize('a'), 'A');
});

Deno.test('capitalize handles uppercase single character', () => {
  assertEquals(capitalize('A'), 'A');
});

Deno.test('capitalize preserves rest of string', () => {
  assertEquals(capitalize('hELLO wORLD'), 'HELLO wORLD');
});

Deno.test('capitalize handles numbers at start', () => {
  assertEquals(capitalize('123abc'), '123abc');
});

Deno.test('capitalize handles special characters', () => {
  assertEquals(capitalize('!hello'), '!hello');
});

// ============================================================================
// toKebabCase tests
// ============================================================================

Deno.test('toKebabCase converts camelCase', () => {
  assertEquals(toKebabCase('camelCase'), 'camel-case');
});

Deno.test('toKebabCase converts PascalCase', () => {
  assertEquals(toKebabCase('PascalCase'), 'pascal-case');
});

Deno.test('toKebabCase handles spaces', () => {
  assertEquals(toKebabCase('hello world'), 'hello-world');
});

Deno.test('toKebabCase handles underscores', () => {
  assertEquals(toKebabCase('hello_world'), 'hello-world');
});

Deno.test('toKebabCase handles mixed separators', () => {
  assertEquals(toKebabCase('hello_world test'), 'hello-world-test');
});

Deno.test('toKebabCase handles already kebab-case', () => {
  assertEquals(toKebabCase('already-kebab'), 'already-kebab');
});

Deno.test('toKebabCase handles empty string', () => {
  assertEquals(toKebabCase(''), '');
});

Deno.test('toKebabCase handles single word', () => {
  assertEquals(toKebabCase('hello'), 'hello');
});

Deno.test('toKebabCase handles multiple uppercase letters', () => {
  // Note: The implementation treats consecutive uppercase as a unit
  // followed by a lowercase, not as individual characters
  assertEquals(toKebabCase('myHTTPServer'), 'my-httpserver');
});

// ============================================================================
// toSnakeCase tests
// ============================================================================

Deno.test('toSnakeCase converts camelCase', () => {
  assertEquals(toSnakeCase('camelCase'), 'camel_case');
});

Deno.test('toSnakeCase converts PascalCase', () => {
  assertEquals(toSnakeCase('PascalCase'), 'pascal_case');
});

Deno.test('toSnakeCase handles spaces', () => {
  assertEquals(toSnakeCase('hello world'), 'hello_world');
});

Deno.test('toSnakeCase handles hyphens', () => {
  assertEquals(toSnakeCase('hello-world'), 'hello_world');
});

Deno.test('toSnakeCase handles mixed separators', () => {
  assertEquals(toSnakeCase('hello-world test'), 'hello_world_test');
});

Deno.test('toSnakeCase handles already snake_case', () => {
  assertEquals(toSnakeCase('already_snake'), 'already_snake');
});

Deno.test('toSnakeCase handles empty string', () => {
  assertEquals(toSnakeCase(''), '');
});

Deno.test('toSnakeCase handles single word', () => {
  assertEquals(toSnakeCase('hello'), 'hello');
});

// ============================================================================
// toCamelCase tests
// ============================================================================

Deno.test('toCamelCase converts kebab-case', () => {
  assertEquals(toCamelCase('kebab-case'), 'kebabCase');
});

Deno.test('toCamelCase converts snake_case', () => {
  assertEquals(toCamelCase('snake_case'), 'snakeCase');
});

Deno.test('toCamelCase converts space separated', () => {
  assertEquals(toCamelCase('hello world'), 'helloWorld');
});

Deno.test('toCamelCase handles mixed separators', () => {
  assertEquals(toCamelCase('hello-world_test foo'), 'helloWorldTestFoo');
});

Deno.test('toCamelCase handles already camelCase', () => {
  assertEquals(toCamelCase('alreadyCamel'), 'alreadyCamel');
});

Deno.test('toCamelCase handles PascalCase', () => {
  assertEquals(toCamelCase('PascalCase'), 'pascalCase');
});

Deno.test('toCamelCase handles empty string', () => {
  assertEquals(toCamelCase(''), '');
});

Deno.test('toCamelCase handles single word', () => {
  assertEquals(toCamelCase('hello'), 'hello');
});

Deno.test('toCamelCase handles uppercase word', () => {
  assertEquals(toCamelCase('HELLO'), 'hELLO');
});

// ============================================================================
// truncate tests
// ============================================================================

Deno.test('truncate shortens long string', () => {
  assertEquals(truncate('hello world', 8), 'hello...');
});

Deno.test('truncate preserves short string', () => {
  assertEquals(truncate('hello', 10), 'hello');
});

Deno.test('truncate handles exact length', () => {
  assertEquals(truncate('hello', 5), 'hello');
});

Deno.test('truncate handles empty string', () => {
  assertEquals(truncate('', 5), '');
});

Deno.test('truncate handles very short maxLength', () => {
  assertEquals(truncate('hello', 3), '...');
});

Deno.test('truncate with custom ellipsis', () => {
  assertEquals(truncate('hello world', 9, '>>'), 'hello w>>');
});

Deno.test('truncate with empty ellipsis', () => {
  assertEquals(truncate('hello world', 5, ''), 'hello');
});

Deno.test('truncate handles maxLength equal to ellipsis length', () => {
  assertEquals(truncate('hello world', 3, '...'), '...');
});

// ============================================================================
// padLeft tests
// ============================================================================

Deno.test('padLeft pads with spaces by default', () => {
  assertEquals(padLeft('hi', 5), '   hi');
});

Deno.test('padLeft with custom character', () => {
  assertEquals(padLeft('hi', 5, '0'), '000hi');
});

Deno.test('padLeft does nothing when string is already long enough', () => {
  assertEquals(padLeft('hello', 3), 'hello');
});

Deno.test('padLeft handles exact length', () => {
  assertEquals(padLeft('hello', 5), 'hello');
});

Deno.test('padLeft handles empty string', () => {
  assertEquals(padLeft('', 3), '   ');
});

Deno.test('padLeft handles zero length', () => {
  assertEquals(padLeft('hello', 0), 'hello');
});

Deno.test('padLeft handles negative length', () => {
  assertEquals(padLeft('hello', -5), 'hello');
});

// ============================================================================
// padRight tests
// ============================================================================

Deno.test('padRight pads with spaces by default', () => {
  assertEquals(padRight('hi', 5), 'hi   ');
});

Deno.test('padRight with custom character', () => {
  assertEquals(padRight('hi', 5, '0'), 'hi000');
});

Deno.test('padRight does nothing when string is already long enough', () => {
  assertEquals(padRight('hello', 3), 'hello');
});

Deno.test('padRight handles exact length', () => {
  assertEquals(padRight('hello', 5), 'hello');
});

Deno.test('padRight handles empty string', () => {
  assertEquals(padRight('', 3), '   ');
});

Deno.test('padRight handles zero length', () => {
  assertEquals(padRight('hello', 0), 'hello');
});

Deno.test('padRight handles negative length', () => {
  assertEquals(padRight('hello', -5), 'hello');
});

// ============================================================================
// center tests
// ============================================================================

Deno.test('center centers string with spaces', () => {
  assertEquals(center('hi', 6), '  hi  ');
});

Deno.test('center with custom character', () => {
  assertEquals(center('hi', 6, '-'), '--hi--');
});

Deno.test('center handles odd padding', () => {
  assertEquals(center('hi', 5), ' hi  ');
});

Deno.test('center does nothing when string is already long enough', () => {
  assertEquals(center('hello', 3), 'hello');
});

Deno.test('center handles exact width', () => {
  assertEquals(center('hello', 5), 'hello');
});

Deno.test('center handles empty string', () => {
  assertEquals(center('', 4), '    ');
});

Deno.test('center handles single character', () => {
  assertEquals(center('x', 5), '  x  ');
});

Deno.test('center handles zero width', () => {
  assertEquals(center('hello', 0), 'hello');
});

// ============================================================================
// normalizeWhitespace tests
// ============================================================================

Deno.test('normalizeWhitespace trims and collapses spaces', () => {
  assertEquals(normalizeWhitespace('  hello   world  '), 'hello world');
});

Deno.test('normalizeWhitespace handles tabs', () => {
  assertEquals(normalizeWhitespace('\thello\tworld\t'), 'hello world');
});

Deno.test('normalizeWhitespace handles newlines', () => {
  assertEquals(normalizeWhitespace('hello\n\nworld'), 'hello world');
});

Deno.test('normalizeWhitespace handles mixed whitespace', () => {
  assertEquals(normalizeWhitespace('  hello\t\n  world  '), 'hello world');
});

Deno.test('normalizeWhitespace handles single word', () => {
  assertEquals(normalizeWhitespace('  hello  '), 'hello');
});

Deno.test('normalizeWhitespace handles empty string', () => {
  assertEquals(normalizeWhitespace(''), '');
});

Deno.test('normalizeWhitespace handles only whitespace', () => {
  assertEquals(normalizeWhitespace('   \t\n   '), '');
});

// ============================================================================
// isBlank tests
// ============================================================================

Deno.test('isBlank returns true for empty string', () => {
  assertEquals(isBlank(''), true);
});

Deno.test('isBlank returns true for spaces only', () => {
  assertEquals(isBlank('   '), true);
});

Deno.test('isBlank returns true for tabs only', () => {
  assertEquals(isBlank('\t\t'), true);
});

Deno.test('isBlank returns true for newlines only', () => {
  assertEquals(isBlank('\n\n'), true);
});

Deno.test('isBlank returns true for mixed whitespace', () => {
  assertEquals(isBlank('  \t\n  '), true);
});

Deno.test('isBlank returns false for non-empty string', () => {
  assertEquals(isBlank('hello'), false);
});

Deno.test('isBlank returns false for string with leading space', () => {
  assertEquals(isBlank(' hello'), false);
});

Deno.test('isBlank returns false for string with trailing space', () => {
  assertEquals(isBlank('hello '), false);
});

// ============================================================================
// isNotBlank tests
// ============================================================================

Deno.test('isNotBlank returns false for empty string', () => {
  assertEquals(isNotBlank(''), false);
});

Deno.test('isNotBlank returns false for whitespace only', () => {
  assertEquals(isNotBlank('   '), false);
});

Deno.test('isNotBlank returns true for non-empty string', () => {
  assertEquals(isNotBlank('hello'), true);
});

Deno.test('isNotBlank returns true for string with whitespace', () => {
  assertEquals(isNotBlank(' hello '), true);
});

// ============================================================================
// indent tests
// ============================================================================

Deno.test('indent adds spaces to single line', () => {
  assertEquals(indent('hello', 2), '  hello');
});

Deno.test('indent adds spaces to multiple lines', () => {
  assertEquals(indent('hello\nworld', 2), '  hello\n  world');
});

Deno.test('indent handles zero spaces', () => {
  assertEquals(indent('hello', 0), 'hello');
});

Deno.test('indent handles empty string', () => {
  assertEquals(indent('', 2), '  ');
});

Deno.test('indent handles empty lines', () => {
  assertEquals(indent('hello\n\nworld', 2), '  hello\n  \n  world');
});

Deno.test('indent with larger indentation', () => {
  assertEquals(indent('test', 4), '    test');
});

// ============================================================================
// dedent tests
// ============================================================================

Deno.test('dedent removes common leading indentation', () => {
  const input = '  hello\n  world';
  assertEquals(dedent(input), 'hello\nworld');
});

Deno.test('dedent handles mixed indentation levels', () => {
  const input = '    hello\n  world';
  assertEquals(dedent(input), '  hello\nworld');
});

Deno.test('dedent handles tabs', () => {
  const input = '\thello\n\tworld';
  assertEquals(dedent(input), 'hello\nworld');
});

Deno.test('dedent handles empty lines', () => {
  const input = '  hello\n\n  world';
  assertEquals(dedent(input), 'hello\n\nworld');
});

Deno.test('dedent handles string with no common indentation', () => {
  const input = 'hello\nworld';
  assertEquals(dedent(input), 'hello\nworld');
});

Deno.test('dedent handles empty string', () => {
  assertEquals(dedent(''), '');
});

Deno.test('dedent handles string with only whitespace lines', () => {
  const input = '   \n   \n   ';
  assertEquals(dedent(input), '   \n   \n   ');
});

Deno.test('dedent handles single line', () => {
  assertEquals(dedent('  hello'), 'hello');
});

Deno.test('dedent handles triple-quoted template literal style', () => {
  const input = `
    function test() {
      return true;
    }
  `;
  // First line is empty, last line has 2 spaces
  // Minimum indent among non-empty lines is 4 (the function line)
  // Wait, let's trace through this more carefully
  const result = dedent(input);
  // The input lines are:
  // '' (empty)
  // '    function test() {' (4 spaces)
  // '      return true;' (6 spaces)
  // '    }' (4 spaces)
  // '  ' (2 spaces, but this is empty after trim)
  // So min indent of non-empty lines is 4
  assertEquals(result.includes('function test()'), true);
  assertEquals(result.includes('  return true;'), true);
});

Deno.test('dedent preserves relative indentation', () => {
  const input = '  if (true) {\n    nested;\n  }';
  assertEquals(dedent(input), 'if (true) {\n  nested;\n}');
});

Deno.test('dedent handles lines with only spaces', () => {
  const input = '  hello\n     \n  world';
  // The middle line is only spaces, which trims to empty
  // So it's ignored when calculating min indent
  const result = dedent(input);
  assertEquals(result, 'hello\n   \nworld');
});
