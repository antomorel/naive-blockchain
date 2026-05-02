import { UTXORpcs } from "@blockchain/ledger-api/rpc/UTXO";
import { findAllByAddressOrderedByAmountDesc } from "../../application/UTXO/findAllByAddressOrderedByAmountDesc";

export const UTXORpcHandlers = UTXORpcs.toLayer({
  findAllByAddressOrderedByAmountDesc: ({ address }) => findAllByAddressOrderedByAmountDesc(address)
});
