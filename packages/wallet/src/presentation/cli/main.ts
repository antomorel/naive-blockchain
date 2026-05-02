import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { LedgerRpcClientLive } from "../../services/LedgerRpcClientLive.js";
import { balanceCommand } from "./commands/balance.js";
import { generateWalletCommand } from "./commands/generateWallet.js";
import { sendCommand } from "./commands/send.js";

const walletCli = Command.make("wallet").pipe(
  Command.withDescription("Blockchain wallet CLI for managing transactions"),
  Command.withSubcommands([generateWalletCommand, balanceCommand, sendCommand]),
  Command.provide(LedgerRpcClientLive)
);

const program = Command.run(walletCli, {
  version: "0.0.1"
});

program.pipe(Effect.provide(BunServices.layer), BunRuntime.runMain);
