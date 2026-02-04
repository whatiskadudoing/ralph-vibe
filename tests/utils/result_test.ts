/**
 * @module tests/utils/result_test
 *
 * Tests for utils/result module.
 */

import { assertEquals } from '@std/assert';
import {
  all,
  err,
  flatMap,
  fromPromise,
  isErr,
  isOk,
  map,
  mapErr,
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

Deno.test('fromPromise uses default error mapper when not provided', async () => {
  const error = new Error('test error');
  const result = await fromPromise(Promise.reject(error));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, error);
  }
});

// ============================================================================
// mapErr tests
// ============================================================================

Deno.test('mapErr transforms error value', () => {
  const result = mapErr(err('error'), (e) => e.toUpperCase());

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'ERROR');
  }
});

Deno.test('mapErr passes through ok value', () => {
  const result = mapErr(ok(42), (e: string) => e.toUpperCase());

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 42);
  }
});

Deno.test('mapErr can change error type', () => {
  const result = mapErr(err('error'), (e) => ({ message: e, code: 500 }));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, { message: 'error', code: 500 });
  }
});

// ============================================================================
// all tests
// ============================================================================

Deno.test('all combines multiple ok results', () => {
  const results = [ok(1), ok(2), ok(3)];
  const result = all(results);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, [1, 2, 3]);
  }
});

Deno.test('all returns first error when any result is err', () => {
  const results: Result<number, string>[] = [ok(1), err('first error'), ok(3), err('second error')];
  const result = all(results);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'first error');
  }
});

Deno.test('all returns empty array for empty input', () => {
  const results: Result<number, string>[] = [];
  const result = all(results);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, []);
  }
});

Deno.test('all handles single ok result', () => {
  const results = [ok(42)];
  const result = all(results);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, [42]);
  }
});

Deno.test('all handles single err result', () => {
  const results: Result<number, string>[] = [err('only error')];
  const result = all(results);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'only error');
  }
});

// ============================================================================
// Edge cases and complex scenarios
// ============================================================================

Deno.test('ok with undefined value', () => {
  const result = ok(undefined);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, undefined);
  }
});

Deno.test('ok with null value', () => {
  const result = ok(null);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, null);
  }
});

Deno.test('err with complex error object', () => {
  const complexError = { code: 404, message: 'Not found', details: { path: '/api' } };
  const result = err(complexError);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, complexError);
  }
});

Deno.test('map chain multiple transformations', () => {
  const result = map(map(ok(5), (x) => x * 2), (x) => x + 1);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 11);
  }
});

Deno.test('flatMap chain multiple results', () => {
  const divide = (a: number, b: number): Result<number, string> =>
    b === 0 ? err('division by zero') : ok(a / b);

  const result = flatMap(
    flatMap(ok(100), (x) => divide(x, 2)),
    (x) => divide(x, 5),
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 10);
  }
});

Deno.test('flatMap chain stops at first error', () => {
  const divide = (a: number, b: number): Result<number, string> =>
    b === 0 ? err('division by zero') : ok(a / b);

  const result = flatMap(
    flatMap(ok(100), (x) => divide(x, 0)),
    (x) => divide(x, 5),
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'division by zero');
  }
});

Deno.test('unwrap throws with descriptive message', () => {
  let thrownError: Error | null = null;
  try {
    unwrap(err('custom error message'));
  } catch (e) {
    thrownError = e as Error;
  }
  assertEquals(thrownError !== null, true);
  assertEquals(thrownError?.message.includes('custom error message'), true);
});
