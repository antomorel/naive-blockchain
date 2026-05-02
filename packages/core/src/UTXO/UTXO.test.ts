import { describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { expect } from "vitest";
import { Address } from "../primitives/Address.js";
import { Amount } from "../primitives/Amount.js";
import { TransactionId } from "../primitives/TransactionId.js";
import { TxOutputIndex } from "../primitives/TxOutputIndex.js";
import { UTXO } from "./UTXO.js";

describe("UTXO schema", () => {
  const validUTXO = {
    txOutputId: TransactionId.make("abc123"),
    txOutputIndex: TxOutputIndex.make(0),
    address: Address.make("0xrecipient"),
    amount: Amount.make(100)
  };

  it("should accept valid UTXO", () => {
    const utxo = Schema.decodeSync(UTXO)(validUTXO);

    expect(utxo.txOutputId).toBe("abc123");
    expect(utxo.txOutputIndex).toBe(0);
    expect(utxo.address).toBe("0xrecipient");
    expect(utxo.amount).toBe(100);
  });

  it("should encode and decode UTXO", () => {
    const utxo = Schema.decodeSync(UTXO)(validUTXO);
    const encoded = Schema.encodeSync(UTXO)(utxo);
    const decoded = Schema.decodeSync(UTXO)(encoded);

    expect(decoded.txOutputId).toBe(utxo.txOutputId);
    expect(decoded.txOutputIndex).toBe(utxo.txOutputIndex);
    expect(decoded.address).toBe(utxo.address);
    expect(decoded.amount).toBe(utxo.amount);
  });

  it("should reject UTXO with negative amount", () => {
    expect(() =>
      Schema.decodeSync(UTXO)({
        ...validUTXO,
        amount: -10
      })
    ).toThrow();
  });

  it("should reject UTXO with negative txOutputIndex", () => {
    expect(() =>
      Schema.decodeSync(UTXO)({
        ...validUTXO,
        txOutputIndex: -1
      })
    ).toThrow();
  });

  it("should accept UTXO with zero amount", () => {
    const utxo = Schema.decodeSync(UTXO)({
      ...validUTXO,
      amount: 0
    });

    expect(utxo.amount).toBe(0);
  });

  it("should accept UTXO with high txOutputIndex", () => {
    const utxo = Schema.decodeSync(UTXO)({
      ...validUTXO,
      txOutputIndex: 999
    });

    expect(utxo.txOutputIndex).toBe(999);
  });
});
