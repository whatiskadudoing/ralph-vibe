/**
 * @module utils/fp
 *
 * Functional programming utilities for type-safe operations.
 * Provides custom implementations of pipe, flow, Either, Option, and TaskEither
 * that integrate with the existing Result type.
 *
 * @example
 * import { pipe, Either, left, right, isRight } from "@/utils/fp.ts";
 * import { tryCatchTE, runTaskEither } from "@/utils/fp.ts";
 *
 * // Sync error handling with Either
 * const divide = (a: number, b: number): Either<string, number> =>
 *   b === 0 ? left("Division by zero") : right(a / b);
 *
 * // Async error handling with TaskEither
 * const fetchData = tryCatchTE(
 *   () => fetch("/api/data").then(r => r.json()),
 *   (e) => `Fetch failed: ${e}`
 * );
 *
 * // Using pipe for composition
 * const result = pipe(
 *   right(10),
 *   mapEither((x) => x * 2),
 *   flatMapEither((x) => divide(x, 5))
 * );
 */

import { err, isOk, ok, type Result } from '@/utils/result.ts';

// ============================================================================
// Pipe & Flow - Function Composition
// ============================================================================

/**
 * Pipes a value through a series of functions.
 * Each function receives the output of the previous one.
 *
 * @example
 * const result = pipe(
 *   5,
 *   (x) => x * 2,
 *   (x) => x + 1,
 *   (x) => `Result: ${x}`
 * ); // "Result: 11"
 */
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): G;
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): H;
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): I;
export function pipe(
  a: unknown,
  ...fns: Array<(x: unknown) => unknown>
): unknown {
  return fns.reduce((acc, fn) => fn(acc), a);
}

/**
 * Creates a function that pipes its argument through a series of functions.
 * Like pipe, but returns a function instead of executing immediately.
 *
 * @example
 * const process = flow(
 *   (x: number) => x * 2,
 *   (x) => x + 1,
 *   (x) => `Result: ${x}`
 * );
 * process(5); // "Result: 11"
 */
export function flow<A, B>(ab: (a: A) => B): (a: A) => B;
export function flow<A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C;
export function flow<A, B, C, D>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): (a: A) => D;
export function flow<A, B, C, D, E>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): (a: A) => E;
export function flow<A, B, C, D, E, F>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): (a: A) => F;
export function flow<A, B, C, D, E, F, G>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): (a: A) => G;
export function flow<A, B, C, D, E, F, G, H>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): (a: A) => H;
export function flow<A, B, C, D, E, F, G, H, I>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): (a: A) => I;
export function flow(
  ...fns: Array<(x: unknown) => unknown>
): (a: unknown) => unknown {
  return (a: unknown) => fns.reduce((acc, fn) => fn(acc), a);
}

/**
 * Identity function - returns its argument unchanged.
 * Useful as a default transformation or placeholder.
 */
export function identity<A>(a: A): A {
  return a;
}

// ============================================================================
// Either - Synchronous Error Handling
// ============================================================================

/**
 * Represents a left value (typically an error).
 */
export interface Left<E> {
  readonly _tag: 'Left';
  readonly left: E;
}

/**
 * Represents a right value (typically a success).
 */
export interface Right<A> {
  readonly _tag: 'Right';
  readonly right: A;
}

/**
 * Either represents a value of one of two types.
 * By convention, Left is used for errors and Right for success values.
 */
export type Either<E, A> = Left<E> | Right<A>;

/**
 * Creates a Left (error) value.
 */
export function left<E, A = never>(e: E): Either<E, A> {
  return { _tag: 'Left', left: e };
}

/**
 * Creates a Right (success) value.
 */
export function right<A, E = never>(a: A): Either<E, A> {
  return { _tag: 'Right', right: a };
}

/**
 * Type guard for Left values.
 */
export function isLeft<E, A>(either: Either<E, A>): either is Left<E> {
  return either._tag === 'Left';
}

/**
 * Type guard for Right values.
 */
export function isRight<E, A>(either: Either<E, A>): either is Right<A> {
  return either._tag === 'Right';
}

/**
 * Maps a function over a Right value.
 * If the Either is Left, returns it unchanged.
 */
export function mapEither<E, A, B>(
  f: (a: A) => B,
): (either: Either<E, A>) => Either<E, B> {
  return (either) => isRight(either) ? right(f(either.right)) : either;
}

/**
 * Maps a function over a Left value.
 * If the Either is Right, returns it unchanged.
 */
export function mapLeft<E, A, F>(
  f: (e: E) => F,
): (either: Either<E, A>) => Either<F, A> {
  return (either) => isLeft(either) ? left(f(either.left)) : either;
}

/**
 * Chains Either-returning functions.
 * If the Either is Left, returns it unchanged.
 */
export function flatMapEither<E, A, B>(
  f: (a: A) => Either<E, B>,
): (either: Either<E, A>) => Either<E, B> {
  return (either) => isRight(either) ? f(either.right) : either;
}

/**
 * Folds an Either into a single value.
 */
export function foldEither<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B,
): (either: Either<E, A>) => B {
  return (either) => isLeft(either) ? onLeft(either.left) : onRight(either.right);
}

/**
 * Gets the Right value or returns a default.
 */
export function getOrElse<E, A>(defaultValue: (e: E) => A): (either: Either<E, A>) => A {
  return (either) => isRight(either) ? either.right : defaultValue(either.left);
}

/**
 * Wraps a function that may throw in a try-catch and returns an Either.
 */
export function tryCatch<E, A>(
  f: () => A,
  onError: (e: unknown) => E,
): Either<E, A> {
  try {
    return right(f());
  } catch (e) {
    return left(onError(e));
  }
}

// ============================================================================
// Option - Nullable Value Handling
// ============================================================================

/**
 * Represents the absence of a value.
 */
export interface None {
  readonly _tag: 'None';
}

/**
 * Represents the presence of a value.
 */
export interface Some<A> {
  readonly _tag: 'Some';
  readonly value: A;
}

/**
 * Option represents an optional value.
 * None means absence, Some means presence.
 */
export type Option<A> = None | Some<A>;

/**
 * The singleton None value.
 */
export const none: Option<never> = { _tag: 'None' };

/**
 * Creates a Some value.
 */
export function some<A>(a: A): Option<A> {
  return { _tag: 'Some', value: a };
}

/**
 * Type guard for None values.
 */
export function isNone<A>(option: Option<A>): option is None {
  return option._tag === 'None';
}

/**
 * Type guard for Some values.
 */
export function isSome<A>(option: Option<A>): option is Some<A> {
  return option._tag === 'Some';
}

/**
 * Creates an Option from a nullable value.
 */
export function fromNullable<A>(a: A | null | undefined): Option<A> {
  return a === null || a === undefined ? none : some(a);
}

/**
 * Maps a function over a Some value.
 * If the Option is None, returns None.
 */
export function mapOption<A, B>(
  f: (a: A) => B,
): (option: Option<A>) => Option<B> {
  return (option) => isSome(option) ? some(f(option.value)) : none;
}

/**
 * Chains Option-returning functions.
 * If the Option is None, returns None.
 */
export function flatMapOption<A, B>(
  f: (a: A) => Option<B>,
): (option: Option<A>) => Option<B> {
  return (option) => isSome(option) ? f(option.value) : none;
}

/**
 * Folds an Option into a single value.
 */
export function foldOption<A, B>(
  onNone: () => B,
  onSome: (a: A) => B,
): (option: Option<A>) => B {
  return (option) => isSome(option) ? onSome(option.value) : onNone();
}

/**
 * Gets the Some value or returns a default.
 */
export function getOrElseOption<A>(defaultValue: () => A): (option: Option<A>) => A {
  return (option) => isSome(option) ? option.value : defaultValue();
}

/**
 * Converts an Option to an Either.
 */
export function optionToEither<E, A>(
  onNone: () => E,
): (option: Option<A>) => Either<E, A> {
  return (option) => isSome(option) ? right(option.value) : left(onNone());
}

/**
 * Converts an Either to an Option, discarding the error.
 */
export function eitherToOption<E, A>(either: Either<E, A>): Option<A> {
  return isRight(either) ? some(either.right) : none;
}

// ============================================================================
// TaskEither - Asynchronous Error Handling
// ============================================================================

/**
 * TaskEither represents an asynchronous operation that may fail.
 * It's a lazy computation - nothing executes until you call the function.
 */
export type TaskEither<E, A> = () => Promise<Either<E, A>>;

/**
 * Creates a TaskEither that succeeds with a value.
 */
export function taskEitherRight<A, E = never>(a: A): TaskEither<E, A> {
  return () => Promise.resolve(right(a));
}

/**
 * Creates a TaskEither that fails with an error.
 */
export function taskEitherLeft<E, A = never>(e: E): TaskEither<E, A> {
  return () => Promise.resolve(left(e));
}

/**
 * Wraps an async function in a TaskEither with error handling.
 *
 * @example
 * const fetchUser = tryCatchTE(
 *   () => fetch("/api/user").then(r => r.json()),
 *   (e) => `Network error: ${e}`
 * );
 */
export function tryCatchTE<E, A>(
  f: () => Promise<A>,
  onError: (e: unknown) => E,
): TaskEither<E, A> {
  return async () => {
    try {
      const result = await f();
      return right(result);
    } catch (e) {
      return left(onError(e));
    }
  };
}

/**
 * Maps a function over a TaskEither's success value.
 */
export function mapTE<E, A, B>(
  f: (a: A) => B,
): (te: TaskEither<E, A>) => TaskEither<E, B> {
  return (te) => async () => {
    const result = await te();
    return isRight(result) ? right(f(result.right)) : result;
  };
}

/**
 * Maps a function over a TaskEither's error value.
 */
export function mapLeftTE<E, A, F>(
  f: (e: E) => F,
): (te: TaskEither<E, A>) => TaskEither<F, A> {
  return (te) => async () => {
    const result = await te();
    return isLeft(result) ? left(f(result.left)) : result;
  };
}

/**
 * Chains TaskEither-returning functions.
 */
export function flatMapTE<E, A, B>(
  f: (a: A) => TaskEither<E, B>,
): (te: TaskEither<E, A>) => TaskEither<E, B> {
  return (te) => async () => {
    const result = await te();
    if (isLeft(result)) return result;
    return f(result.right)();
  };
}

/**
 * Folds a TaskEither into a single value.
 */
export function foldTE<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B,
): (te: TaskEither<E, A>) => () => Promise<B> {
  return (te) => async () => {
    const result = await te();
    return isLeft(result) ? onLeft(result.left) : onRight(result.right);
  };
}

/**
 * Executes a TaskEither and returns the Either result.
 */
export function runTaskEither<E, A>(te: TaskEither<E, A>): Promise<Either<E, A>> {
  return te();
}

/**
 * Converts a Promise to a TaskEither.
 */
export function fromPromiseTE<E, A>(
  promise: () => Promise<A>,
  onError: (e: unknown) => E,
): TaskEither<E, A> {
  return tryCatchTE(promise, onError);
}

/**
 * Lifts an Either into a TaskEither.
 */
export function fromEitherTE<E, A>(either: Either<E, A>): TaskEither<E, A> {
  return () => Promise.resolve(either);
}

/**
 * Sequences an array of TaskEithers, returning first Left or all Rights.
 */
export function sequenceTE<E, A>(
  tasks: readonly TaskEither<E, A>[],
): TaskEither<E, readonly A[]> {
  return async () => {
    const results: A[] = [];
    for (const task of tasks) {
      const result = await task();
      if (isLeft(result)) return result;
      results.push(result.right);
    }
    return right(results);
  };
}

/**
 * Runs TaskEithers in parallel, returning first Left or all Rights.
 */
export function parallelTE<E, A>(
  tasks: readonly TaskEither<E, A>[],
): TaskEither<E, readonly A[]> {
  return async () => {
    const results = await Promise.all(tasks.map((t) => t()));
    const values: A[] = [];
    for (const result of results) {
      if (isLeft(result)) return result;
      values.push(result.right);
    }
    return right(values);
  };
}

// ============================================================================
// Result Interop
// ============================================================================

/**
 * Converts a Result to an Either.
 * Ok becomes Right, Err becomes Left.
 */
export function fromResult<T, E>(result: Result<T, E>): Either<E, T> {
  return isOk(result) ? right(result.value) : left(result.error);
}

/**
 * Converts an Either to a Result.
 * Right becomes Ok, Left becomes Err.
 */
export function toResult<E, A>(either: Either<E, A>): Result<A, E> {
  return isRight(either) ? ok(either.right) : err(either.left);
}

/**
 * Converts a Result-returning function to an Either-returning function.
 */
export function liftResult<Args extends unknown[], T, E>(
  f: (...args: Args) => Result<T, E>,
): (...args: Args) => Either<E, T> {
  return (...args) => fromResult(f(...args));
}

/**
 * Converts an Either-returning function to a Result-returning function.
 */
export function liftEither<Args extends unknown[], E, A>(
  f: (...args: Args) => Either<E, A>,
): (...args: Args) => Result<A, E> {
  return (...args) => toResult(f(...args));
}

/**
 * Converts a Promise<Result> to a TaskEither.
 */
export function fromResultAsync<T, E>(
  resultPromise: () => Promise<Result<T, E>>,
): TaskEither<E, T> {
  return async () => {
    const result = await resultPromise();
    return fromResult(result);
  };
}

/**
 * Converts a TaskEither to a Promise<Result>.
 */
export async function toResultAsync<E, A>(
  te: TaskEither<E, A>,
): Promise<Result<A, E>> {
  const either = await te();
  return toResult(either);
}

// ============================================================================
// Branded Types - Type-Safe Identifiers
// ============================================================================

/**
 * Brand symbol for creating nominal types from structural types.
 */
declare const brand: unique symbol;

/**
 * Creates a branded type. The brand prevents accidental mixing of
 * structurally identical but semantically different types.
 *
 * @example
 * type UserId = Brand<string, "UserId">;
 * type OrderId = Brand<string, "OrderId">;
 *
 * // These are incompatible even though both are strings:
 * const userId: UserId = "123" as UserId;
 * const orderId: OrderId = userId; // Type error!
 */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/**
 * Branded string type for session identifiers.
 */
export type SessionId = Brand<string, 'SessionId'>;

/**
 * Branded string type for task identifiers.
 */
export type TaskId = Brand<string, 'TaskId'>;

/**
 * Branded string type for file paths.
 */
export type FilePath = Brand<string, 'FilePath'>;

/**
 * Creates a SessionId from a string.
 * In production, you might want to validate the format here.
 */
export function sessionId(id: string): SessionId {
  return id as SessionId;
}

/**
 * Creates a TaskId from a string.
 */
export function taskId(id: string): TaskId {
  return id as TaskId;
}

/**
 * Creates a FilePath from a string.
 */
export function filePath(path: string): FilePath {
  return path as FilePath;
}

/**
 * Validates and creates a SessionId, returning an Option.
 */
export function parseSessionId(id: string): Option<SessionId> {
  // Basic validation: non-empty string
  return id.trim().length > 0 ? some(sessionId(id)) : none;
}

/**
 * Validates and creates a TaskId, returning an Option.
 */
export function parseTaskId(id: string): Option<TaskId> {
  return id.trim().length > 0 ? some(taskId(id)) : none;
}

/**
 * Validates and creates a FilePath, returning an Option.
 */
export function parseFilePath(path: string): Option<FilePath> {
  return path.trim().length > 0 ? some(filePath(path)) : none;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Constant function - ignores its argument and returns the given value.
 */
export function constant<A>(a: A): () => A {
  return () => a;
}

/**
 * Flips the arguments of a two-argument function.
 */
export function flip<A, B, C>(f: (a: A) => (b: B) => C): (b: B) => (a: A) => C {
  return (b) => (a) => f(a)(b);
}

/**
 * Applies a value to a function.
 */
export function apply<A, B>(a: A): (f: (a: A) => B) => B {
  return (f) => f(a);
}

/**
 * Creates a tuple from two values.
 */
export function tuple<A, B>(a: A, b: B): readonly [A, B] {
  return [a, b] as const;
}

/**
 * Gets the first element of a tuple.
 *
 * @example
 * const t = tuple(1, "hello");
 * first(t); // 1
 */
export function first<A, B>(t: readonly [A, B]): A {
  return t[0];
}

/**
 * Gets the first element of a tuple.
 * @deprecated Use `first` instead. This alias will be removed in a future version.
 */
export function fst<A, B>(t: readonly [A, B]): A {
  return first(t);
}

/**
 * Gets the second element of a tuple.
 *
 * @example
 * const t = tuple(1, "hello");
 * second(t); // "hello"
 */
export function second<A, B>(t: readonly [A, B]): B {
  return t[1];
}

/**
 * Gets the second element of a tuple.
 * @deprecated Use `second` instead. This alias will be removed in a future version.
 */
export function snd<A, B>(t: readonly [A, B]): B {
  return second(t);
}
