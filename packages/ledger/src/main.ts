import { BunRuntime } from "@effect/platform-bun";
import { Array, Cause, Effect, Layer, Logger } from "effect";
import { WorkflowEngine } from "effect/unstable/workflow";
import { ApplyBlockWorkflowLayer } from "./application/Blockchain/ApplyBlockWorkflow";
import { runMiner } from "./application/Mining/runMiner";
import { listenForIncomingBlocks } from "./application/Network/listenForIncomingBlocks";
import { listenForIncomingTransactions } from "./application/Network/listenForIncomingTransactions";
import { LedgerConfig, LedgerConfigLive, MatrixConfigLive } from "./config";
import { MatrixNetworkService } from "./infrastructure/network/MatrixNetworkService";
import { TestMinerService } from "./infrastructure/TestMinerService";
import { BlockchainRepositoryLive, UTXOSetLive } from "./live";
import { HttpServerLive } from "./presentation/http/server";
import { RpcServerLive } from "./presentation/rpc/server";

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
    listenForIncomingTransactions(),
    Layer.launch(HttpServerLive),
    Layer.launch(RpcServerLive),
    listenForIncomingBlocks()
  ],
  { concurrency: "unbounded" }
).pipe(
  Effect.provide(LoggerLive),
  Effect.provide(ApplyBlockWorkflowLayer),
  Effect.provide(WorkflowEngine.layerMemory),
  Effect.provide(UTXOSetLive),
  Effect.provide(BlockchainRepositoryLive),
  Effect.provide(LedgerConfigLive),
  Effect.provide(MatrixNetworkService.Live()),
  Effect.provide(MatrixConfigLive),
  Effect.provide(TestMinerService),
  BunRuntime.runMain
);
