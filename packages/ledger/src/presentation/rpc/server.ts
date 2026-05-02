import { LedgerRpcs } from "@blockchain/ledger-api/rpc/ledgerRpc";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";
import { TransactionRpcHandlers } from "./Transaction";
import { UTXORpcHandlers } from "./UTXO";

const PORT = 3000;

const RpcProtocol = RpcServer.layerProtocolHttp({ path: "/rpc" }).pipe(
  Layer.provide(HttpRouter.layer)
);

const HandlersLive = Layer.mergeAll(UTXORpcHandlers, TransactionRpcHandlers);

const RpcLive = RpcServer.layer(LedgerRpcs).pipe(Layer.provide(HandlersLive));

export const RpcServerLive = RpcLive.pipe(
  Layer.provideMerge(RpcProtocol),
  Layer.provide(HttpRouter.serve(RpcProtocol, { disableListenLog: false })),
  Layer.provide(BunHttpServer.layer({ port: PORT })),
  Layer.tap(() => Effect.logInfo(`Listening at http://localhost:${PORT}`)),
  Layer.provide(RpcSerialization.layerNdjson)
);
