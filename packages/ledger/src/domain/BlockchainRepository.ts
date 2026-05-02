import type { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import type { DateTime } from "effect";
import { Array, Context, Effect, Layer, Option, pipe, Record, Schema } from "effect";
import { type Block, GenesisBlock } from "./Block";
import { Blockchain } from "./Blockchain";

export class BlockchainPersistenceError extends Schema.TaggedErrorClass<BlockchainPersistenceError>()(
  "BlockchainPersistenceError",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}
export class CannotRemoveGenesisBlockError extends Schema.TaggedErrorClass<CannotRemoveGenesisBlockError>()(
  "CannotRemoveGenesisBlockError",
  {}
) {}

export class CanOnlyRemoveLastBlockError extends Schema.TaggedErrorClass<CanOnlyRemoveLastBlockError>()(
  "CanOnlyRemoveLastBlockError",
  {}
) {}

export interface BlockchainRepository {
  readonly getBlockchain: () => Effect.Effect<Blockchain>;
  readonly getBlocks: (params: {
    skip: number;
    take: number;
  }) => Effect.Effect<ReadonlyArray<Block>>;
  readonly getTransactions: (params: {
    skip: number;
    take: number;
  }) => Effect.Effect<ReadonlyArray<{ transaction: Transaction; blockTimestamp: DateTime.Utc }>>;
  readonly addTransactionToPool: (
    transaction: Transaction
  ) => Effect.Effect<Blockchain, BlockchainPersistenceError>;
  readonly addBlock: (block: Block) => Effect.Effect<Blockchain, BlockchainPersistenceError>;
  readonly removeLastBlock: (
    lastBlockHash: BlockHash
  ) => Effect.Effect<
    Blockchain,
    BlockchainPersistenceError | CannotRemoveGenesisBlockError | CanOnlyRemoveLastBlockError
  >;
  readonly clearMinedTransactions: (
    transactionIds: ReadonlyArray<Transaction["id"]>
  ) => Effect.Effect<Blockchain, BlockchainPersistenceError>;
  readonly restoreMempool: (
    transactions: ReadonlyArray<Transaction>
  ) => Effect.Effect<Blockchain, BlockchainPersistenceError>;
}

export const BlockchainRepository = Context.Service<BlockchainRepository>(
  "@blockchain/ledger/BlockchainRepository"
);

export class InMemoryBlockchainRepository implements BlockchainRepository {
  static Live = Layer.succeed(BlockchainRepository, new InMemoryBlockchainRepository());

  protected blockchain: Blockchain = Blockchain.make({
    blocks: pipe(Record.empty<BlockHash, Block>(), Record.set(GenesisBlock.hash, GenesisBlock)),
    latestBlockHash: GenesisBlock.hash,
    height: BlockHeight.make(0),
    genesisBlockHash: GenesisBlock.hash,
    mempool: []
  });

  getBlockchain = () => Effect.succeed(this.blockchain);

  getBlocks = ({ skip, take }: { skip: number; take: number }) => {
    const blocks: Block[] = [];
    let currentBlockOption = Record.get(this.blockchain.blocks, this.blockchain.latestBlockHash);

    while (Option.isSome(currentBlockOption)) {
      blocks.push(currentBlockOption.value);
      const previousHash = currentBlockOption.value.header.previousHash;
      if (Option.isNone(previousHash)) break;
      currentBlockOption = Record.get(this.blockchain.blocks, previousHash.value);
    }

    return Effect.succeed(blocks.slice(skip, skip + take));
  };

  getTransactions = ({ skip, take }: { skip: number; take: number }) => {
    const blocks: Block[] = [];
    let currentBlockOption = Record.get(this.blockchain.blocks, this.blockchain.latestBlockHash);

    while (Option.isSome(currentBlockOption)) {
      blocks.push(currentBlockOption.value);
      const previousHash = currentBlockOption.value.header.previousHash;
      if (Option.isNone(previousHash)) break;
      currentBlockOption = Record.get(this.blockchain.blocks, previousHash.value);
    }

    const transactions = Array.flatMap(blocks, (block) =>
      Array.map(block.transactions, (transaction) => ({
        transaction,
        blockTimestamp: block.header.timestamp
      }))
    );

    return Effect.succeed(transactions.slice(skip, skip + take));
  };

  addTransactionToPool = (transaction: Transaction) => {
    const newPool = Array.append(this.blockchain.mempool, transaction);

    this.blockchain = new Blockchain({
      ...this.blockchain,
      mempool: newPool
    });

    return Effect.succeed(this.blockchain);
  };

  addBlock = (block: Block) => {
    const newBlocks = Record.set(this.blockchain.blocks, block.hash, block);

    this.blockchain = new Blockchain({
      ...this.blockchain,
      blocks: newBlocks,
      latestBlockHash: block.hash,
      height: block.height
    });

    return Effect.succeed(this.blockchain);
  };

  clearMinedTransactions = (transactionIds: ReadonlyArray<Transaction["id"]>) => {
    const idsSet = new Set(transactionIds);
    const newPool = Array.filter(this.blockchain.mempool, (tx) => !idsSet.has(tx.id));

    this.blockchain = new Blockchain({
      ...this.blockchain,
      mempool: newPool
    });

    return Effect.succeed(this.blockchain);
  };

  removeLastBlock = (lastBlockHash: BlockHash) =>
    Effect.gen({ self: this }, function* () {
      if (this.blockchain.height === BlockHeight.make(0)) {
        return yield* new CannotRemoveGenesisBlockError();
      }

      const lastBlock = yield* Blockchain.getLatestBlock(this.blockchain);

      if (lastBlock.hash !== lastBlockHash) {
        return yield* new CanOnlyRemoveLastBlockError();
      }

      const previousHash = lastBlock.header.previousHash;
      if (Option.isNone(previousHash)) {
        return yield* new CannotRemoveGenesisBlockError();
      }

      const newBlocks = Record.remove(this.blockchain.blocks, lastBlock.hash);

      this.blockchain = new Blockchain({
        ...this.blockchain,
        blocks: newBlocks,
        latestBlockHash: previousHash.value,
        height: BlockHeight.make(lastBlock.height - 1)
      });

      return this.blockchain;
    });

  restoreMempool = (transactions: ReadonlyArray<Transaction>) => {
    this.blockchain = new Blockchain({
      ...this.blockchain,
      mempool: transactions
    });

    return Effect.succeed(this.blockchain);
  };
}
