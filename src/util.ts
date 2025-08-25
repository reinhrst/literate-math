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
