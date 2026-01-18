/**
 * @module utils/string
 *
 * Pure string manipulation functions.
 */

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to kebab-case.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to snake_case.
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Converts a string to camelCase.
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number, ellipsis = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Pads a string on the left to reach the desired length.
 */
export function padLeft(str: string, length: number, char = ' '): string {
  const padLength = Math.max(0, length - str.length);
  return char.repeat(padLength) + str;
}

/**
 * Pads a string on the right to reach the desired length.
 */
export function padRight(str: string, length: number, char = ' '): string {
  const padLength = Math.max(0, length - str.length);
  return str + char.repeat(padLength);
}

/**
 * Centers a string within the given width.
 */
export function center(str: string, width: number, char = ' '): string {
  const padLength = Math.max(0, width - str.length);
  const leftPad = Math.floor(padLength / 2);
  const rightPad = padLength - leftPad;
  return char.repeat(leftPad) + str + char.repeat(rightPad);
}

/**
 * Removes leading and trailing whitespace and collapses internal whitespace.
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Checks if a string is blank (empty or only whitespace).
 */
export function isBlank(str: string): boolean {
  return str.trim().length === 0;
}

/**
 * Checks if a string is not blank.
 */
export function isNotBlank(str: string): boolean {
  return !isBlank(str);
}

/**
 * Indents each line of a string by the given amount.
 */
export function indent(str: string, spaces: number): string {
  const indentation = ' '.repeat(spaces);
  return str
    .split('\n')
    .map((line) => indentation + line)
    .join('\n');
}

/**
 * Removes common leading indentation from all lines.
 */
export function dedent(str: string): string {
  const lines = str.split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) return str;

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match && match[1] !== undefined ? match[1].length : 0;
    }),
  );

  return lines.map((line) => line.slice(minIndent)).join('\n');
}
