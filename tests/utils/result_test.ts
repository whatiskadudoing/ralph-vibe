/**
 * @module tests/utils/result_test
 *
 * Tests for utils/result module.
 */

import { assertEquals } from '@std/assert';
import {
  err,
  flatMap,
  fromPromise,
  isErr,
  isOk,
  map,
  ok,
  type Result,
  unwrap,
  unwrapOr,
} from '../../src/utils/result.ts';

// ============================================================================
// ok/err tests
// ============================================================================

Deno.test('ok creates success result', () => {
  const result = ok(42);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 42);
  }
});

Deno.test('err creates error result', () => {
  const result = err('something went wrong');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'something went wrong');
  }
});

// ============================================================================
// isOk/isErr tests
// ============================================================================

Deno.test('isOk returns true for ok result', () => {
  assertEquals(isOk(ok(1)), true);
  assertEquals(isOk(err('error')), false);
});

Deno.test('isErr returns true for err result', () => {
  assertEquals(isErr(err('error')), true);
  assertEquals(isErr(ok(1)), false);
});

// ============================================================================
// map tests
// ============================================================================

Deno.test('map transforms ok value', () => {
  const result = map(ok(5), (x) => x * 2);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 10);
  }
});

Deno.test('map passes through error', () => {
  const result = map(err('error'), (x: number) => x * 2);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'error');
  }
});

// ============================================================================
// flatMap tests
// ============================================================================

Deno.test('flatMap chains ok results', () => {
  const result = flatMap(ok(5), (x) => ok(x * 2));

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 10);
  }
});

Deno.test('flatMap propagates error from first', () => {
  const errorResult: Result<number, string> = err('first error');
  const result = flatMap(errorResult, (x: number) => ok(x * 2));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'first error');
  }
});

Deno.test('flatMap propagates error from second', () => {
  const result = flatMap(ok(5), (_x) => err('second error'));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'second error');
  }
});

// ============================================================================
// unwrap tests
// ============================================================================

Deno.test('unwrap returns value for ok', () => {
  assertEquals(unwrap(ok(42)), 42);
});

Deno.test('unwrap throws for err', () => {
  let threw = false;
  try {
    unwrap(err('error'));
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

// ============================================================================
// unwrapOr tests
// ============================================================================

Deno.test('unwrapOr returns value for ok', () => {
  assertEquals(unwrapOr(ok(42), 0), 42);
});

Deno.test('unwrapOr returns default for err', () => {
  assertEquals(unwrapOr(err('error'), 0), 0);
});

// ============================================================================
// fromPromise tests
// ============================================================================

Deno.test('fromPromise wraps resolved promise', async () => {
  const result = await fromPromise(Promise.resolve(42), (e) => String(e));

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 42);
  }
});

Deno.test('fromPromise wraps rejected promise', async () => {
  const result = await fromPromise(
    Promise.reject(new Error('failed')),
    (e) => (e as Error).message,
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'failed');
  }
});
