import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Logger } from "effect";
import { WorkflowEngine } from "effect/unstable/workflow";
import { MineBlockWorkflowLayer } from "./application/Mining/UpdateBlockchainAfterMinedBlockWorkflow";
import { runMiner } from "./application/Mining/runMiner";
import { LedgerConfig, LedgerConfigLive } from "./config";
import { TestMinerService } from "./infrastructure/TestMinerService";
import { BlockchainRepositoryLive, UTXOSetLive } from "./live";
import { RpcServerLive } from "./presentation/rpc/server";

const LoggerLive = Logger.layer([
  Logger.make(({ logLevel, message }) => {
    globalThis.console.log(`[${logLevel}] ${message}`);
  })
]);

Effect.all(
  [
    runMiner().pipe(Effect.when(LedgerConfig.useSync((config) => config.shouldMine))),
    Layer.launch(RpcServerLive)
  ],
  { concurrency: "unbounded" }
).pipe(
  Effect.provide(LoggerLive),
  Effect.provide(MineBlockWorkflowLayer),
  Effect.provide(WorkflowEngine.layerMemory),
  Effect.provide(UTXOSetLive),
  Effect.provide(BlockchainRepositoryLive),
  Effect.provide(LedgerConfigLive),
  Effect.provide(TestMinerService),
  BunRuntime.runMain
);
