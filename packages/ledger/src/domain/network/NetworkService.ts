import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import type { Effect, Stream } from "effect";
import { Context, Schema } from "effect";
import type { Block } from "../Block.js";

export class NetworkBroadcastError extends Schema.TaggedErrorClass<NetworkBroadcastError>()(
  "NetworkBroadcastError",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {
  static fromCause = (reason: string) => (cause: unknown) =>
    new NetworkBroadcastError({ reason, cause });
}

export class NetworkConnectionError extends Schema.TaggedErrorClass<NetworkConnectionError>()(
  "NetworkConnectionError",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {
  static fromCause = (reason: string) => (cause: unknown) =>
    new NetworkConnectionError({ reason, cause });
}

export interface NetworkService {
  readonly broadcastBlock: (block: Block) => Effect.Effect<void, NetworkBroadcastError>;
  readonly broadcastTransaction: (
    transaction: Transaction
  ) => Effect.Effect<void, NetworkBroadcastError>;
  readonly onBlockReceived: Stream.Stream<Block>;
  readonly onTransactionReceived: Stream.Stream<Transaction>;
}

export const NetworkService = Context.Service<NetworkService>("@blockchain/ledger/NetworkService");
