export type DeepReadOnly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K] // Functions are not made deeply read-only
      : DeepReadOnly<T[K]> // Recursively apply to objects
    : T[K]; // Keep primitives as-is
};
