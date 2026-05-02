import { Address } from "@blockchain/core/primitives/Address";
import { Array, Console, Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { LedgerRpcClient } from "../../../domain/Ledger/LedgerRpcClient.js";

export const balanceCommand = Command.make(
  "balance",
  {
    address: Flag.string("address").pipe(
      Flag.withAlias("a"),
      Flag.withDescription("The wallet address to check balance for"),
      Flag.withSchema(Address)
    )
  },
  ({ address }) =>
    Effect.gen(function* () {
      const client = yield* LedgerRpcClient;
      const utxos = yield* client.findAllByAddressOrderedByAmountDesc({ address });

      const totalBalance = Array.reduce(utxos, 0, (acc, utxo) => acc + utxo.amount);

      yield* Console.log(`Address: ${address}`);
      yield* Console.log(`Balance: ${totalBalance}`);
      yield* Console.log(`UTXOs:   ${utxos.length}`);
    })
).pipe(Command.withDescription("Check balance for a wallet address"));
