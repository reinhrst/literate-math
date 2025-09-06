export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };


export function tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error as E };
  }
}

export function TSAssertType<T>(_: unknown): asserts _ is T {
  // typescript only, no code
}

export type VariableManuallyPutOutOfScope = never
export function TSPutVariableOutOfScope(_: unknown): asserts _ is VariableManuallyPutOutOfScope {
  // typescript only, no code
}

export type DeepReadOnly<T> = {
  readonly [K in keyof T]: T[K] extends object
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    ? T[K] extends Function
      ? T[K] // Functions are not made deeply read-only
      : DeepReadOnly<T[K]> // Recursively apply to objects
    : T[K]; // Keep primitives as-is
};
