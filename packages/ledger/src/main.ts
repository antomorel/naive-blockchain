import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Logger } from "effect";
import { BlockchainRepositoryLive, UTXOSetLive } from "./live";
import { RpcServerLive } from "./presentation/rpc/server";

const LoggerLive = Logger.layer([
  Logger.make(({ logLevel, message }) => {
    globalThis.console.log(`[${logLevel}] ${message}`);
  })
]);

Layer.launch(RpcServerLive).pipe(
  Effect.provide(LoggerLive),
  Effect.provide(UTXOSetLive),
  Effect.provide(BlockchainRepositoryLive),
  BunRuntime.runMain
);
