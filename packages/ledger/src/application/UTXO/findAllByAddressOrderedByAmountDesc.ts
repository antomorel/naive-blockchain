import type { Address } from "@blockchain/core/primitives/Address";
import { Effect } from "effect";
import { UTXOSet } from "../../domain/UTXOSet";

export const findAllByAddressOrderedByAmountDesc = Effect.fn("findAllByAddressOrderedByAmountDesc")(
  function* (address: Address) {
    const utxos = yield* UTXOSet.use(({ findAllByAddressOrderedByAmountDesc }) =>
      findAllByAddressOrderedByAmountDesc(address)
    );

    return utxos;
  }
);
