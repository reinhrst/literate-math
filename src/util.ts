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

export function TSAssertType<T>(_: unknown): asserts _ is T {}

export type VariableManuallyPutOutOfScope = never
export function TSPutVariableOutOfScope(_: unknown): asserts _ is VariableManuallyPutOutOfScope {}

