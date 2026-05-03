import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Effect, Layer, Option, PubSub, Schema, Stream } from "effect";
import * as sdk from "matrix-js-sdk";
import { MatrixConfig } from "../../config.js";
import { Block } from "../../domain/Block.js";
import {
  NetworkBroadcastError,
  NetworkConnectionError,
  NetworkService
} from "../../domain/network/NetworkService.js";
import {
  BLOCK_EVENT_TYPE,
  MatrixBlockEventContent,
  MatrixTransactionEventContent,
  TRANSACTION_EVENT_TYPE,
  type MatrixEventContentEncoded
} from "./MatrixEventTypes.js";

export class MatrixNetworkService implements NetworkService {
  constructor(
    private readonly client: sdk.MatrixClient,
    private readonly config: typeof MatrixConfig.Service,
    private readonly blockPubSub: PubSub.PubSub<Block>,
    private readonly transactionPubSub: PubSub.PubSub<Transaction>,
    private readonly room: sdk.Room
  ) {
    this.setupEventListeners();
  }

  static Live = () =>
    Effect.gen(function* () {
      const config = yield* MatrixConfig;
      const blockPubSub = yield* PubSub.unbounded<Block>();
      const transactionPubSub = yield* PubSub.unbounded<Transaction>();

      yield* Effect.log(`Logging in to Matrix client with user ID: ${config.userId}`);

      const client = sdk.createClient({
        baseUrl: config.homeserverUrl,
        userId: config.userId
      });

      yield* Effect.tryPromise({
        try: async () => {
          const { access_token } = await client.loginRequest({
            type: "m.login.password",
            identifier: { type: "m.id.user", user: config.userId },
            password: config.password
          });

          client.setAccessToken(access_token);
        },
        catch: NetworkConnectionError.fromCause("Failed to login to Matrix client with password")
      });

      yield* Effect.tryPromise({
        try: () => client.startClient({ initialSyncLimit: 10 }),
        catch: NetworkConnectionError.fromCause("Failed to start Matrix client")
      });

      yield* Effect.log("Matrix client started");

      yield* Effect.callback<void, NetworkConnectionError>((resume) => {
        const onSync = (state: sdk.SyncState) => {
          if (state === "PREPARED") {
            client.removeListener(sdk.ClientEvent.Sync, onSync);
            resume(Effect.void);
          } else if (state === "ERROR") {
            client.removeListener(sdk.ClientEvent.Sync, onSync);
            resume(
              Effect.fail(new NetworkConnectionError({ reason: "Sync failed with ERROR state" }))
            );
          }
        };
        client.on(sdk.ClientEvent.Sync, onSync);
      });

      const room = yield* Effect.tryPromise({
        try: () => client.joinRoom(config.roomAlias),
        catch: NetworkConnectionError.fromCause(`Failed to join room ${config.roomAlias}`)
      });

      const roomId = room.roomId;
      yield* Effect.log(`Joined room ${config.roomAlias} (ID: ${roomId})`);

      yield* Effect.addFinalizer(() => Effect.sync(() => client.stopClient()));

      return new MatrixNetworkService(client, config, blockPubSub, transactionPubSub, room);
    }).pipe(Layer.effect(NetworkService));

  private setupEventListeners = () => {
    this.client.on(sdk.RoomEvent.Timeline, (event, _room, toStartOfTimeline) => {
      if (toStartOfTimeline) return;

      const senderNode = event.getContent()?.sender_node;
      if (senderNode === this.config.nodeId) return;

      const eventType = event.getType();
      const content = event.getContent();

      if (eventType === BLOCK_EVENT_TYPE) {
        const decoded = Schema.decodeUnknownOption(MatrixBlockEventContent)(content);

        if (Option.isSome(decoded)) {
          const block = new Block({
            hash: decoded.value.hash,
            height: decoded.value.height,
            header: decoded.value.header,
            transactions: decoded.value.transactions
          });
          Effect.runFork(PubSub.publish(this.blockPubSub, block));
        }
      } else if (eventType === TRANSACTION_EVENT_TYPE) {
        const decoded = Schema.decodeUnknownOption(MatrixTransactionEventContent)(content);

        if (Option.isSome(decoded)) {
          Effect.runFork(PubSub.publish(this.transactionPubSub, decoded.value.transaction));
        }
      }
    });
  };

  private sendCustomEvent = (eventType: string, eventContentEncoded: MatrixEventContentEncoded) =>
    Effect.tryPromise({
      try: () =>
        // eslint-disable-next-line
        this.client.sendEvent(this.room.roomId, eventType as any, {
          ...eventContentEncoded,
          sender_node: this.config.nodeId
        }),
      catch: NetworkBroadcastError.fromCause("Failed to broadcast transaction")
    });

  broadcastBlock = (block: Block) =>
    Effect.gen({ self: this }, function* () {
      const content = new MatrixBlockEventContent({
        hash: block.hash,
        height: block.height,
        header: block.header,
        transactions: [...block.transactions]
      });

      const encoded = yield* Schema.encodeEffect(MatrixBlockEventContent)(content).pipe(
        Effect.mapError(NetworkBroadcastError.fromCause("Failed to encode block event content"))
      );

      yield* this.sendCustomEvent(BLOCK_EVENT_TYPE, encoded);

      yield* Effect.log(`Broadcast block: height=${block.height}, hash=${block.hash}`);
    });

  broadcastTransaction = (transaction: Transaction) =>
    Effect.gen({ self: this }, function* () {
      const content = new MatrixTransactionEventContent({ transaction });

      const encoded = yield* Schema.encodeEffect(MatrixTransactionEventContent)(content).pipe(
        Effect.mapError(NetworkBroadcastError.fromCause("Failed to encode block event content"))
      );

      yield* this.sendCustomEvent(TRANSACTION_EVENT_TYPE, encoded);

      yield* Effect.log(`Broadcast transaction: id=${transaction.id}`);
    });

  get onBlockReceived() {
    return Stream.fromPubSub(this.blockPubSub);
  }

  get onTransactionReceived() {
    return Stream.fromPubSub(this.transactionPubSub);
  }
}
