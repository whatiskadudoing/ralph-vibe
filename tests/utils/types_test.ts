/**
 * @module tests/utils/types_test
 *
 * Tests for utils/types module.
 */

import { assertEquals } from '@std/assert';
import { isNonEmpty, type NonEmptyArray } from '../../src/utils/types.ts';

// ============================================================================
// isNonEmpty tests
// ============================================================================

Deno.test('isNonEmpty returns true for array with one element', () => {
  assertEquals(isNonEmpty([1]), true);
});

Deno.test('isNonEmpty returns true for array with multiple elements', () => {
  assertEquals(isNonEmpty([1, 2, 3]), true);
});

Deno.test('isNonEmpty returns false for empty array', () => {
  assertEquals(isNonEmpty([]), false);
});

Deno.test('isNonEmpty returns true for array with undefined element', () => {
  assertEquals(isNonEmpty([undefined]), true);
});

Deno.test('isNonEmpty returns true for array with null element', () => {
  assertEquals(isNonEmpty([null]), true);
});

Deno.test('isNonEmpty returns true for array of strings', () => {
  assertEquals(isNonEmpty(['a', 'b', 'c']), true);
});

Deno.test('isNonEmpty returns true for array of objects', () => {
  assertEquals(isNonEmpty([{ id: 1 }, { id: 2 }]), true);
});

Deno.test('isNonEmpty works with readonly arrays', () => {
  const readonlyArr: readonly number[] = [1, 2, 3];
  assertEquals(isNonEmpty(readonlyArr), true);
});

Deno.test('isNonEmpty works with empty readonly arrays', () => {
  const readonlyArr: readonly number[] = [];
  assertEquals(isNonEmpty(readonlyArr), false);
});

// ============================================================================
// Type narrowing tests (verify type guard behavior)
// ============================================================================

Deno.test('isNonEmpty narrows type correctly', () => {
  const arr: number[] = [1, 2, 3];

  if (isNonEmpty(arr)) {
    // After type guard, arr is NonEmptyArray<number>
    const first: number = arr[0]; // This should be valid
    assertEquals(first, 1);
  }
});

Deno.test('isNonEmpty type guard allows accessing first element', () => {
  const arr: string[] = ['hello', 'world'];

  if (isNonEmpty(arr)) {
    const typed: NonEmptyArray<string> = arr;
    assertEquals(typed[0], 'hello');
    assertEquals(typed.length >= 1, true);
  }
});

Deno.test('isNonEmpty handles mixed type arrays', () => {
  const mixed: (string | number)[] = [1, 'two', 3];
  assertEquals(isNonEmpty(mixed), true);

  if (isNonEmpty(mixed)) {
    assertEquals(mixed[0], 1);
  }
});
