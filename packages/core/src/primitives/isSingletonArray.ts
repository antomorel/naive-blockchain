export const isSingletonArray = <T>(array: readonly T[]): array is readonly [T] =>
  array.length === 1
