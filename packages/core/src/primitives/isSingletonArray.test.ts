import { describe, it } from "@effect/vitest";
import { expect } from "vitest";
import { isSingletonArray } from "./isSingletonArray.js";

describe("isSingletonArray", () => {
  it("should return true for array with exactly one element", () => {
    expect(isSingletonArray([1])).toBe(true);
    expect(isSingletonArray(["hello"])).toBe(true);
    expect(isSingletonArray([{ a: 1 }])).toBe(true);
    expect(isSingletonArray([null])).toBe(true);
    expect(isSingletonArray([undefined])).toBe(true);
  });

  it("should return false for empty array", () => {
    expect(isSingletonArray([])).toBe(false);
  });

  it("should return false for array with multiple elements", () => {
    expect(isSingletonArray([1, 2])).toBe(false);
    expect(isSingletonArray([1, 2, 3])).toBe(false);
    expect(isSingletonArray(["a", "b"])).toBe(false);
  });

  it("should work with readonly arrays", () => {
    const readonlyArray: readonly number[] = [42];
    expect(isSingletonArray(readonlyArray)).toBe(true);
  });

  it("should narrow type to tuple of one element", () => {
    const arr: readonly number[] = [42];

    if (isSingletonArray(arr)) {
      // TypeScript should now know arr is [number]
      const first: number = arr[0];
      expect(first).toBe(42);
    }
  });
});
