/**
 * @module utils/types
 *
 * Shared type definitions used across the application.
 */

/**
 * A branded type helper for creating nominal types.
 * Prevents accidentally mixing up strings that represent different things.
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type PostId = Brand<string, 'PostId'>;
 *
 * const userId: UserId = 'user-123' as UserId;
 * const postId: PostId = userId; // Type error!
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Makes all properties of T deeply readonly.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extracts the element type from an array type.
 */
export type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Makes specified keys required while keeping others optional.
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * A non-empty array type.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Checks if an array is non-empty (type guard).
 */
export function isNonEmpty<T>(arr: readonly T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}
