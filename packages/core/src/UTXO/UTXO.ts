import { Address } from "@blockchain/core/primitives/Address";
import { Amount } from "@blockchain/core/primitives/Amount";
import { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { Schema } from "effect";

export const UTXO = Schema.Struct({
  txOutputId: TransactionId,
  txOutputIndex: TxOutputIndex,
  address: Address,
  amount: Amount
});
export type UTXO = typeof UTXO.Type;
