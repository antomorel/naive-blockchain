import { Address } from "@blockchain/core/primitives/Address";
import { Config, Context, Effect, Layer, type Option, pipe } from "effect";

export class LedgerConfig extends Context.Service<
  LedgerConfig,
  {
    readonly shouldMine: boolean;
    readonly minerAddress: Option.Option<Address>;
  }
>()("@config/ledger") {}

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

export class MatrixConfig extends Context.Service<
  MatrixConfig,
  {
    readonly homeserverUrl: string;
    readonly userId: string;
    readonly password: string;
    readonly roomAlias: string;
    readonly nodeId: string;
  }
>()("@config/matrix") {}

export const matrixConfig = Effect.gen(function* () {
  const config = yield* pipe(
    Config.all({
      homeserverUrl: Config.string("HOMESERVER_URL"),
      userId: Config.string("USER_ID"),
      password: Config.string("PASSWORD"),
      roomAlias: Config.string("ROOM_ALIAS"),
      nodeId: Config.string("NODE_ID")
    }),
    Config.nested("MATRIX")
  );

  return config;
});

export const MatrixConfigLive = Layer.effect(MatrixConfig)(matrixConfig);
