/**
 * @module utils/result
 *
 * Result type for functional error handling.
 * Instead of throwing exceptions, functions return Result<T, E>.
 *
 * @example
 * const parseNumber = (s: string): Result<number, string> => {
 *   const n = parseInt(s, 10);
 *   return isNaN(n) ? err(`Invalid number: ${s}`) : ok(n);
 * };
 *
 * const result = parseNumber('42');
 * if (isOk(result)) {
 *   console.log(result.value); // 42
 * }
 */

/**
 * Represents a successful result containing a value.
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Represents a failed result containing an error.
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * A Result is either Ok<T> or Err<E>.
 * Use this for operations that can fail instead of throwing exceptions.
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Creates a successful Result.
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result.
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard to check if a Result is Ok.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Type guard to check if a Result is Err.
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Unwraps a Result, throwing if it's an Err.
 * Use sparingly - prefer pattern matching with isOk/isErr.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Unwrap called on Err: ${result.error}`);
}

/**
 * Unwraps a Result, returning a default value if it's an Err.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Maps a function over a successful Result.
 * If the Result is Err, returns the Err unchanged.
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 * Maps a function over a failed Result.
 * If the Result is Ok, returns the Ok unchanged.
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * Chains Result-returning functions.
 * If the Result is Err, returns the Err unchanged.
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

/**
 * Converts a Promise that might reject into a Promise<Result>.
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  mapError: (e: unknown) => E = (e) => e as E,
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(mapError(e));
  }
}

/**
 * Combines multiple Results into a single Result.
 * If any Result is Err, returns the first Err.
 */
export function all<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
}
