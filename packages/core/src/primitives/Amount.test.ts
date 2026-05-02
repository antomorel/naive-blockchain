import { describe, it } from "@effect/vitest";
import { expect } from "vitest";
import { Amount } from "./Amount.js";

describe("Amount primitive", () => {
  it("should accept zero", () => {
    const amount = Amount.make(0);
    expect(amount).toBe(0);
  });

  it("should accept positive integers", () => {
    const amount = Amount.make(100);
    expect(amount).toBe(100);
  });

  it("should accept positive decimals", () => {
    const amount = Amount.make(100.5);
    expect(amount).toBe(100.5);
  });

  it("should accept large numbers", () => {
    const amount = Amount.make(1_000_000_000);
    expect(amount).toBe(1_000_000_000);
  });

  it("should reject negative numbers", () => {
    expect(() => Amount.make(-1)).toThrow();
  });

  it("should reject negative decimals", () => {
    expect(() => Amount.make(-0.5)).toThrow();
  });

  it("should be branded as Amount type", () => {
    const amount = Amount.make(100);
    // TypeScript ensures this is an Amount, not just a number
    const _typeCheck: Amount = amount;
    expect(typeof _typeCheck).toBe("number");
  });

  it("should allow arithmetic operations", () => {
    const a = Amount.make(100);
    const b = Amount.make(50);

    // After arithmetic, we need to re-brand if we want Amount type
    const sum = Amount.make(a + b);
    expect(sum).toBe(150);
  });
});
