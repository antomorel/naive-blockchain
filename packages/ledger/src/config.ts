import { Address } from "@blockchain/core/primitives/Address";
import { Config, Context, Effect, Layer, type Option, pipe } from "effect";

export class LedgerConfig extends Context.Service<
  LedgerConfig,
  {
    readonly shouldMine: boolean;
    readonly minerAddress: Option.Option<Address>;
  }
>()("LedgerConfig") {}

export const ledgerConfig = Effect.gen(function* () {
  const config = yield* pipe(
    Config.all({
      shoudlMine: Config.boolean("SHOULD_MINE"),
      minerAddress: Config.schema(Address, "MINER_ADDRESS").pipe(Config.option)
    }),
    Config.nested("LEDGER")
  );

  return {
    shouldMine: config.shoudlMine,
    minerAddress: config.minerAddress
  };
});

export const LedgerConfigLive = Layer.effect(LedgerConfig)(ledgerConfig);
