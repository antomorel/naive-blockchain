import { BunRuntime } from "@effect/platform-bun";
import { Array, Cause, Effect, Layer, Logger } from "effect";
import { WorkflowEngine } from "effect/unstable/workflow";
import { MineBlockWorkflowLayer } from "./application/Mining/UpdateBlockchainAfterMinedBlockWorkflow";
import { runMiner } from "./application/Mining/runMiner";
import { LedgerConfig, LedgerConfigLive, MatrixConfigLive } from "./config";
import { TestMinerService } from "./infrastructure/TestMinerService";
import { BlockchainRepositoryLive, UTXOSetLive } from "./live";
import { HttpServerLive } from "./presentation/http/server";
import { RpcServerLive } from "./presentation/rpc/server";
import { MatrixNetworkService } from "./infrastructure/network/MatrixNetworkService";

const LoggerLive = Logger.layer([
  Logger.make(({ logLevel, cause, message }) => {
    globalThis.console.log(
      `[${logLevel}] ${Array.isArray(message) && Array.isArrayEmpty(message) ? JSON.stringify(Cause.squash(cause), null, 2) : message}`
    );
  })
]);

Effect.all(
  [
    runMiner().pipe(Effect.when(LedgerConfig.useSync((config) => config.shouldMine))),
    Layer.launch(RpcServerLive),
    Layer.launch(HttpServerLive)
  ],
  { concurrency: "unbounded" }
).pipe(
  Effect.provide(LoggerLive),
  Effect.provide(MineBlockWorkflowLayer),
  Effect.provide(WorkflowEngine.layerMemory),
  Effect.provide(UTXOSetLive),
  Effect.provide(BlockchainRepositoryLive),
  Effect.provide(LedgerConfigLive),
  Effect.provide(MatrixNetworkService.Live()),
  Effect.provide(MatrixConfigLive),
  Effect.provide(TestMinerService),
  BunRuntime.runMain
);
