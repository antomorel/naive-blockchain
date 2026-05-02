import { Address } from "@blockchain/core/primitives/Address";
import { UTXO } from "@blockchain/core/UTXO/UTXO";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { InternalServerError } from "../errors/apiErrors";

const FindAllByAddressOrderedByAmountDesc = Rpc.make("findAllByAddressOrderedByAmountDesc", {
  success: Schema.Array(UTXO),
  error: InternalServerError,
  payload: {
    address: Address
  }
});

export const UTXORpcs = RpcGroup.make(FindAllByAddressOrderedByAmountDesc);
