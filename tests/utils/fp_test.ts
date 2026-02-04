/**
 * @module tests/utils/fp_test
 *
 * Tests for utils/fp module.
 * Covers functional programming utilities: pipe, flow, Either, Option, TaskEither,
 * Result interop, and branded types.
 */

import { assertEquals } from '@std/assert';
import {
  // Pipe & Flow
  apply,
  constant,
  // Either
  eitherToOption,
  filePath,
  first,
  flatMapEither,
  flatMapOption,
  flatMapTE,
  flip,
  flow,
  foldEither,
  foldOption,
  foldTE,
  fromEitherTE,
  fromNullable,
  fromPromiseTE,
  // Result Interop
  fromResult,
  fromResultAsync,
  fst,
  getOrElse,
  getOrElseOption,
  identity,
  isLeft,
  isNone,
  isRight,
  isSome,
  left,
  liftEither,
  liftResult,
  mapEither,
  mapLeft,
  mapLeftTE,
  mapOption,
  mapTE,
  none,
  type Option,
  // Option
  optionToEither,
  parallelTE,
  parseFilePath,
  parseSessionId,
  parseTaskId,
  pipe,
  right,
  runTaskEither,
  second,
  sequenceTE,
  // Branded Types
  sessionId,
  snd,
  some,
  taskEitherLeft,
  // TaskEither
  taskEitherRight,
  taskId,
  toResult,
  toResultAsync,
  tryCatch,
  tryCatchTE,
  // Utility Functions
  tuple,
} from '../../src/utils/fp.ts';
import { err, isErr, isOk, ok, type Result } from '../../src/utils/result.ts';

// ============================================================================
// pipe Tests
// ============================================================================

Deno.test('pipe with single value returns the value', () => {
  const result = pipe(5);
  assertEquals(result, 5);
});

Deno.test('pipe with one function applies the function', () => {
  const result = pipe(5, (x) => x * 2);
  assertEquals(result, 10);
});

Deno.test('pipe chains multiple functions', () => {
  const result = pipe(
    5,
    (x) => x * 2, // 10
    (x) => x + 1, // 11
    (x) => `Result: ${x}`, // "Result: 11"
  );
  assertEquals(result, 'Result: 11');
});

Deno.test('pipe preserves types through transformations', () => {
  const result = pipe(
    'hello',
    (s) => s.length, // number
    (n) => n * 2, // number
    (n) => n > 5, // boolean
  );
  assertEquals(result, true);
});

Deno.test('pipe with many functions', () => {
  const result = pipe(
    1,
    (x) => x + 1, // 2
    (x) => x * 2, // 4
    (x) => x + 3, // 7
    (x) => x * 4, // 28
    (x) => x - 8, // 20
  );
  assertEquals(result, 20);
});

// ============================================================================
// flow Tests
// ============================================================================

Deno.test('flow creates a function from single function', () => {
  const double = flow((x: number) => x * 2);
  assertEquals(double(5), 10);
});

Deno.test('flow composes multiple functions', () => {
  const process = flow(
    (x: number) => x * 2,
    (x) => x + 1,
    (x) => `Result: ${x}`,
  );

  assertEquals(process(5), 'Result: 11');
  assertEquals(process(10), 'Result: 21');
});

Deno.test('flow can be reused', () => {
  const addThenDouble = flow(
    (x: number) => x + 10,
    (x) => x * 2,
  );

  assertEquals(addThenDouble(5), 30);
  assertEquals(addThenDouble(0), 20);
  assertEquals(addThenDouble(-5), 10);
});

// ============================================================================
// identity Tests
// ============================================================================

Deno.test('identity returns the same value', () => {
  assertEquals(identity(5), 5);
  assertEquals(identity('hello'), 'hello');
  assertEquals(identity(null), null);

  const obj = { a: 1 };
  assertEquals(identity(obj), obj);
});

// ============================================================================
// Either - left, right, isLeft, isRight Tests
// ============================================================================

Deno.test('left creates a Left value', () => {
  const l = left<string>('error');

  assertEquals(l._tag, 'Left');
  if (isLeft(l)) {
    assertEquals(l.left, 'error');
  }
});

Deno.test('right creates a Right value', () => {
  const r = right<number>(42);

  assertEquals(r._tag, 'Right');
  if (isRight(r)) {
    assertEquals(r.right, 42);
  }
});

Deno.test('isLeft returns true for Left', () => {
  assertEquals(isLeft(left('error')), true);
  assertEquals(isLeft(right(42)), false);
});

Deno.test('isRight returns true for Right', () => {
  assertEquals(isRight(right(42)), true);
  assertEquals(isRight(left('error')), false);
});

// ============================================================================
// Either - mapEither Tests
// ============================================================================

Deno.test('mapEither transforms Right value', () => {
  const result = pipe(right(5), mapEither((x) => x * 2));

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 10);
  }
});

Deno.test('mapEither passes through Left unchanged', () => {
  const result = pipe(
    left<string, number>('error'),
    mapEither((x) => x * 2),
  );

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'error');
  }
});

// ============================================================================
// Either - mapLeft Tests
// ============================================================================

Deno.test('mapLeft transforms Left value', () => {
  const result = pipe(
    left<string, number>('error'),
    mapLeft((e) => `Mapped: ${e}`),
  );

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'Mapped: error');
  }
});

Deno.test('mapLeft passes through Right unchanged', () => {
  const result = pipe(right<number, string>(42), mapLeft((e) => `Mapped: ${e}`));

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

// ============================================================================
// Either - flatMapEither Tests
// ============================================================================

Deno.test('flatMapEither chains successful operations', () => {
  const divide = (a: number, b: number) =>
    b === 0 ? left<string, number>('Division by zero') : right<number, string>(a / b);

  const result = pipe(
    right<number, string>(10),
    flatMapEither((x) => divide(x, 2)),
  );

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 5);
  }
});

Deno.test('flatMapEither short-circuits on Left', () => {
  const result = pipe(
    left<string, number>('initial error'),
    flatMapEither((x) => right<number, string>(x * 2)),
  );

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'initial error');
  }
});

Deno.test('flatMapEither propagates error from chained function', () => {
  const result = pipe(
    right<number, string>(0),
    flatMapEither((
      x,
    ) => (x === 0 ? left<string, number>('Cannot be zero') : right<number, string>(10 / x))),
  );

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'Cannot be zero');
  }
});

// ============================================================================
// Either - foldEither Tests
// ============================================================================

Deno.test('foldEither handles Right', () => {
  const result = pipe(
    right(42),
    foldEither(
      (e) => `Error: ${e}`,
      (a) => `Success: ${a}`,
    ),
  );

  assertEquals(result, 'Success: 42');
});

Deno.test('foldEither handles Left', () => {
  const result = pipe(
    left('oops'),
    foldEither(
      (e) => `Error: ${e}`,
      (a) => `Success: ${a}`,
    ),
  );

  assertEquals(result, 'Error: oops');
});

// ============================================================================
// Either - getOrElse Tests
// ============================================================================

Deno.test('getOrElse returns Right value', () => {
  const result = pipe(right(42), getOrElse(() => 0));

  assertEquals(result, 42);
});

Deno.test('getOrElse returns default for Left', () => {
  const result = pipe(
    left<string, number>('error'),
    getOrElse(() => 0),
  );

  assertEquals(result, 0);
});

Deno.test('getOrElse can use error in default', () => {
  const result = pipe(
    left<number, string>(404),
    getOrElse((code) => `Error ${code}`),
  );

  assertEquals(result, 'Error 404');
});

// ============================================================================
// Either - tryCatch Tests
// ============================================================================

Deno.test('tryCatch returns Right on success', () => {
  const result = tryCatch(
    () => JSON.parse('{"a": 1}'),
    (e) => `Parse error: ${e}`,
  );

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right.a, 1);
  }
});

Deno.test('tryCatch returns Left on error', () => {
  const result = tryCatch(
    () => JSON.parse('invalid json'),
    () => 'Parse error',
  );

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'Parse error');
  }
});

// ============================================================================
// Option - some, none, isSome, isNone Tests
// ============================================================================

Deno.test('some creates a Some value', () => {
  const s = some(42);

  assertEquals(s._tag, 'Some');
  if (isSome(s)) {
    assertEquals(s.value, 42);
  }
});

Deno.test('none is a None value', () => {
  assertEquals(none._tag, 'None');
});

Deno.test('isSome returns true for Some', () => {
  assertEquals(isSome(some(42)), true);
  assertEquals(isSome(none), false);
});

Deno.test('isNone returns true for None', () => {
  assertEquals(isNone(none), true);
  assertEquals(isNone(some(42)), false);
});

// ============================================================================
// Option - fromNullable Tests
// ============================================================================

Deno.test('fromNullable creates Some for non-null values', () => {
  assertEquals(isSome(fromNullable(42)), true);
  assertEquals(isSome(fromNullable('hello')), true);
  assertEquals(isSome(fromNullable(0)), true);
  assertEquals(isSome(fromNullable('')), true);
  assertEquals(isSome(fromNullable(false)), true);
});

Deno.test('fromNullable creates None for null and undefined', () => {
  assertEquals(isNone(fromNullable(null)), true);
  assertEquals(isNone(fromNullable(undefined)), true);
});

// ============================================================================
// Option - mapOption Tests
// ============================================================================

Deno.test('mapOption transforms Some value', () => {
  const result = pipe(some(5), mapOption((x) => x * 2));

  assertEquals(isSome(result), true);
  if (isSome(result)) {
    assertEquals(result.value, 10);
  }
});

Deno.test('mapOption returns None for None', () => {
  const noneNumber: Option<number> = none;
  const result = pipe(
    noneNumber,
    mapOption((x: number) => x * 2),
  );

  assertEquals(isNone(result), true);
});

// ============================================================================
// Option - flatMapOption Tests
// ============================================================================

Deno.test('flatMapOption chains successful operations', () => {
  const safeDivide = (a: number, b: number): Option<number> => (b === 0 ? none : some(a / b));

  const result = pipe(
    some(10),
    flatMapOption((x) => safeDivide(x, 2)),
  );

  assertEquals(isSome(result), true);
  if (isSome(result)) {
    assertEquals(result.value, 5);
  }
});

Deno.test('flatMapOption returns None when function returns None', () => {
  const safeDivide = (a: number, b: number): Option<number> => (b === 0 ? none : some(a / b));

  const result = pipe(
    some(10),
    flatMapOption((x) => safeDivide(x, 0)),
  );

  assertEquals(isNone(result), true);
});

Deno.test('flatMapOption short-circuits on None', () => {
  const noneNumber: Option<number> = none;
  const result = pipe(
    noneNumber,
    flatMapOption((x: number) => some(x * 2)),
  );

  assertEquals(isNone(result), true);
});

// ============================================================================
// Option - foldOption Tests
// ============================================================================

Deno.test('foldOption handles Some', () => {
  const result = pipe(
    some(42),
    foldOption(
      () => 'none',
      (a) => `some: ${a}`,
    ),
  );

  assertEquals(result, 'some: 42');
});

Deno.test('foldOption handles None', () => {
  const result = pipe(
    none,
    foldOption(
      () => 'none',
      (a) => `some: ${a}`,
    ),
  );

  assertEquals(result, 'none');
});

// ============================================================================
// Option - getOrElseOption Tests
// ============================================================================

Deno.test('getOrElseOption returns Some value', () => {
  const result = pipe(some(42), getOrElseOption(() => 0));

  assertEquals(result, 42);
});

Deno.test('getOrElseOption returns default for None', () => {
  const noneNumber: Option<number> = none;
  const result = pipe(
    noneNumber,
    getOrElseOption(() => 0),
  );

  assertEquals(result, 0);
});

// ============================================================================
// Option/Either Conversion Tests
// ============================================================================

Deno.test('optionToEither converts Some to Right', () => {
  const result = pipe(
    some(42),
    optionToEither(() => 'no value'),
  );

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

Deno.test('optionToEither converts None to Left', () => {
  const result = pipe(
    none,
    optionToEither(() => 'no value'),
  );

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'no value');
  }
});

Deno.test('eitherToOption converts Right to Some', () => {
  const result = eitherToOption(right(42));

  assertEquals(isSome(result), true);
  if (isSome(result)) {
    assertEquals(result.value, 42);
  }
});

Deno.test('eitherToOption converts Left to None', () => {
  const result = eitherToOption(left('error'));

  assertEquals(isNone(result), true);
});

// ============================================================================
// TaskEither - taskEitherRight, taskEitherLeft Tests
// ============================================================================

Deno.test('taskEitherRight creates successful TaskEither', async () => {
  const te = taskEitherRight(42);
  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

Deno.test('taskEitherLeft creates failed TaskEither', async () => {
  const te = taskEitherLeft('error');
  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'error');
  }
});

// ============================================================================
// TaskEither - tryCatchTE Tests
// ============================================================================

Deno.test('tryCatchTE wraps successful async operation', async () => {
  const te = tryCatchTE(
    () => Promise.resolve(42),
    (e) => `Error: ${e}`,
  );

  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

Deno.test('tryCatchTE wraps failed async operation', async () => {
  const te = tryCatchTE(
    () => Promise.reject(new Error('fail')),
    () => 'caught error',
  );

  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'caught error');
  }
});

// ============================================================================
// TaskEither - mapTE Tests
// ============================================================================

Deno.test('mapTE transforms success value', async () => {
  const te = pipe(taskEitherRight(5), mapTE((x) => x * 2));

  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 10);
  }
});

Deno.test('mapTE passes through error', async () => {
  const te = pipe(
    taskEitherLeft<string, number>('error'),
    mapTE((x) => x * 2),
  );

  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'error');
  }
});

// ============================================================================
// TaskEither - mapLeftTE Tests
// ============================================================================

Deno.test('mapLeftTE transforms error value', async () => {
  const te = pipe(
    taskEitherLeft<string, number>('error'),
    mapLeftTE((e) => `Mapped: ${e}`),
  );

  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'Mapped: error');
  }
});

Deno.test('mapLeftTE passes through success', async () => {
  const te = pipe(taskEitherRight<number, string>(42), mapLeftTE((e) => `Mapped: ${e}`));

  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

// ============================================================================
// TaskEither - flatMapTE Tests
// ============================================================================

Deno.test('flatMapTE chains successful async operations', async () => {
  const te = pipe(
    taskEitherRight<number, string>(10),
    flatMapTE((x) => taskEitherRight(x * 2)),
  );

  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 20);
  }
});

Deno.test('flatMapTE short-circuits on error', async () => {
  let called = false;

  const te = pipe(
    taskEitherLeft<string, number>('initial error'),
    flatMapTE((x) => {
      called = true;
      return taskEitherRight(x * 2);
    }),
  );

  const result = await te();

  assertEquals(called, false);
  assertEquals(isLeft(result), true);
});

Deno.test('flatMapTE propagates error from chained function', async () => {
  const te = pipe(
    taskEitherRight<number, string>(0),
    flatMapTE((x) => (x === 0 ? taskEitherLeft('Cannot be zero') : taskEitherRight(10 / x))),
  );

  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'Cannot be zero');
  }
});

// ============================================================================
// TaskEither - foldTE Tests
// ============================================================================

Deno.test('foldTE handles success', async () => {
  const fold = pipe(
    taskEitherRight(42),
    foldTE(
      (e) => `Error: ${e}`,
      (a) => `Success: ${a}`,
    ),
  );

  const result = await fold();

  assertEquals(result, 'Success: 42');
});

Deno.test('foldTE handles error', async () => {
  const fold = pipe(
    taskEitherLeft('oops'),
    foldTE(
      (e) => `Error: ${e}`,
      (a) => `Success: ${a}`,
    ),
  );

  const result = await fold();

  assertEquals(result, 'Error: oops');
});

// ============================================================================
// TaskEither - runTaskEither Tests
// ============================================================================

Deno.test('runTaskEither executes TaskEither', async () => {
  const te = taskEitherRight(42);
  const result = await runTaskEither(te);

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

// ============================================================================
// TaskEither - fromPromiseTE Tests
// ============================================================================

Deno.test('fromPromiseTE wraps promise', async () => {
  const te = fromPromiseTE(
    () => Promise.resolve(42),
    (e) => `Error: ${e}`,
  );

  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

// ============================================================================
// TaskEither - fromEitherTE Tests
// ============================================================================

Deno.test('fromEitherTE lifts Right to TaskEither', async () => {
  const te = fromEitherTE(right(42));
  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

Deno.test('fromEitherTE lifts Left to TaskEither', async () => {
  const te = fromEitherTE(left('error'));
  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'error');
  }
});

// ============================================================================
// TaskEither - sequenceTE Tests
// ============================================================================

Deno.test('sequenceTE collects all successful results', async () => {
  const tasks = [taskEitherRight(1), taskEitherRight(2), taskEitherRight(3)];

  const te = sequenceTE(tasks);
  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, [1, 2, 3]);
  }
});

Deno.test('sequenceTE returns first error', async () => {
  const tasks = [taskEitherRight(1), taskEitherLeft('error at 2'), taskEitherRight(3)];

  const te = sequenceTE(tasks);
  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'error at 2');
  }
});

// ============================================================================
// TaskEither - parallelTE Tests
// ============================================================================

Deno.test('parallelTE runs tasks in parallel', async () => {
  const tasks = [taskEitherRight(1), taskEitherRight(2), taskEitherRight(3)];

  const te = parallelTE(tasks);
  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, [1, 2, 3]);
  }
});

Deno.test('parallelTE returns error if any task fails', async () => {
  const tasks = [taskEitherRight(1), taskEitherLeft('parallel error'), taskEitherRight(3)];

  const te = parallelTE(tasks);
  const result = await te();

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'parallel error');
  }
});

// ============================================================================
// Result Interop - fromResult Tests
// ============================================================================

Deno.test('fromResult converts Ok to Right', () => {
  const result = fromResult(ok(42));

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

Deno.test('fromResult converts Err to Left', () => {
  const result = fromResult(err('error'));

  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, 'error');
  }
});

// ============================================================================
// Result Interop - toResult Tests
// ============================================================================

Deno.test('toResult converts Right to Ok', () => {
  const result = toResult(right(42));

  assertEquals(isOk(result), true);
  if (isOk(result)) {
    assertEquals(result.value, 42);
  }
});

Deno.test('toResult converts Left to Err', () => {
  const result = toResult(left('error'));

  assertEquals(isErr(result), true);
  if (isErr(result)) {
    assertEquals(result.error, 'error');
  }
});

// ============================================================================
// Result Interop - liftResult Tests
// ============================================================================

Deno.test('liftResult converts Result-returning function to Either', () => {
  const okFn = (x: number): Result<number, string> => ok(x * 2);
  const lifted = liftResult(okFn);

  const result = lifted(5);

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 10);
  }
});

// ============================================================================
// Result Interop - liftEither Tests
// ============================================================================

Deno.test('liftEither converts Either-returning function to Result', () => {
  const rightFn = (x: number) => right<number, string>(x * 2);
  const lifted = liftEither(rightFn);

  const result = lifted(5);

  assertEquals(isOk(result), true);
  if (isOk(result)) {
    assertEquals(result.value, 10);
  }
});

// ============================================================================
// Result Interop - fromResultAsync Tests
// ============================================================================

Deno.test('fromResultAsync converts Promise<Result> to TaskEither', async () => {
  const te = fromResultAsync(() => Promise.resolve(ok(42)));
  const result = await te();

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

// ============================================================================
// Result Interop - toResultAsync Tests
// ============================================================================

Deno.test('toResultAsync converts TaskEither to Promise<Result>', async () => {
  const result = await toResultAsync(taskEitherRight(42));

  assertEquals(isOk(result), true);
  if (isOk(result)) {
    assertEquals(result.value, 42);
  }
});

// ============================================================================
// Branded Types - SessionId Tests
// ============================================================================

Deno.test('sessionId creates a SessionId', () => {
  const id = sessionId('session-123');

  // It should be a string at runtime
  assertEquals(typeof id, 'string');
  assertEquals(id, 'session-123');
});

Deno.test('parseSessionId returns Some for valid ID', () => {
  const result = parseSessionId('valid-id');

  assertEquals(isSome(result), true);
  if (isSome(result)) {
    assertEquals(result.value, 'valid-id');
  }
});

Deno.test('parseSessionId returns None for empty string', () => {
  assertEquals(isNone(parseSessionId('')), true);
  assertEquals(isNone(parseSessionId('   ')), true);
});

// ============================================================================
// Branded Types - TaskId Tests
// ============================================================================

Deno.test('taskId creates a TaskId', () => {
  const id = taskId('task-456');

  assertEquals(typeof id, 'string');
  assertEquals(id, 'task-456');
});

Deno.test('parseTaskId returns Some for valid ID', () => {
  const result = parseTaskId('valid-task');

  assertEquals(isSome(result), true);
  if (isSome(result)) {
    assertEquals(result.value, 'valid-task');
  }
});

Deno.test('parseTaskId returns None for empty string', () => {
  assertEquals(isNone(parseTaskId('')), true);
  assertEquals(isNone(parseTaskId('  ')), true);
});

// ============================================================================
// Branded Types - FilePath Tests
// ============================================================================

Deno.test('filePath creates a FilePath', () => {
  const path = filePath('/home/user/file.txt');

  assertEquals(typeof path, 'string');
  assertEquals(path, '/home/user/file.txt');
});

Deno.test('parseFilePath returns Some for valid path', () => {
  const result = parseFilePath('/valid/path');

  assertEquals(isSome(result), true);
  if (isSome(result)) {
    assertEquals(result.value, '/valid/path');
  }
});

Deno.test('parseFilePath returns None for empty string', () => {
  assertEquals(isNone(parseFilePath('')), true);
  assertEquals(isNone(parseFilePath('   ')), true);
});

// ============================================================================
// Utility Functions - constant Tests
// ============================================================================

Deno.test('constant returns a function that always returns the same value', () => {
  const always42 = constant(42);

  assertEquals(always42(), 42);
  assertEquals(always42(), 42);
});

// ============================================================================
// Utility Functions - flip Tests
// ============================================================================

Deno.test('flip reverses function arguments', () => {
  const subtract = (a: number) => (b: number) => a - b;
  const flipped = flip(subtract);

  // subtract(10)(3) = 10 - 3 = 7
  assertEquals(subtract(10)(3), 7);

  // flipped(10)(3) = 3 - 10 = -7
  assertEquals(flipped(10)(3), -7);
});

// ============================================================================
// Utility Functions - apply Tests
// ============================================================================

Deno.test('apply applies a value to a function', () => {
  const double = (x: number) => x * 2;
  const applyFive = apply(5);

  assertEquals(applyFive(double), 10);
});

// ============================================================================
// Utility Functions - tuple Tests
// ============================================================================

Deno.test('tuple creates a tuple from two values', () => {
  const t = tuple(1, 'hello');

  assertEquals(t, [1, 'hello']);
  assertEquals(t[0], 1);
  assertEquals(t[1], 'hello');
});

// ============================================================================
// Utility Functions - first, second Tests
// ============================================================================

Deno.test('first returns first element of tuple', () => {
  const t = tuple(1, 'hello');

  assertEquals(first(t), 1);
});

Deno.test('second returns second element of tuple', () => {
  const t = tuple(1, 'hello');

  assertEquals(second(t), 'hello');
});

// ============================================================================
// Utility Functions - fst, snd (deprecated aliases) Tests
// ============================================================================

Deno.test('fst (deprecated) returns first element of tuple', () => {
  const t = tuple(1, 'hello');

  assertEquals(fst(t), 1);
});

Deno.test('snd (deprecated) returns second element of tuple', () => {
  const t = tuple(1, 'hello');

  assertEquals(snd(t), 'hello');
});
