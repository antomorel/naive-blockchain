import { Schema, Struct } from "effect";
import { Address } from "../primitives/Address";
import { Amount } from "../primitives/Amount";
import { PublicKey } from "../primitives/PublicKey";
import { Signature } from "../primitives/Signature";
import { TransactionId } from "../primitives/TransactionId";
import { TxOutputIndex } from "../primitives/TxOutputIndex";

export const TransactionInput = Schema.Struct({
  txOutputId: TransactionId,
  txOutputIndex: TxOutputIndex,
  signature: Signature,
  publicKey: PublicKey
});
export type TransactionInput = typeof TransactionInput.Type;

export const UnsignedTransactionInput = TransactionInput.mapFields(
  Struct.pick(["txOutputId", "txOutputIndex"])
);
export type UnsignedTransactionInput = typeof UnsignedTransactionInput.Type;

export const TransactionOutput = Schema.Struct({
  address: Address,
  amount: Amount
});
export type TransactionOutput = typeof TransactionOutput.Type;

export class Transaction extends Schema.Class<Transaction>("Transaction")({
  id: TransactionId,
  inputs: Schema.Array(TransactionInput),
  outputs: Schema.Array(TransactionOutput)
}) {}
