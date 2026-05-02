import type { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Array, Context, Data, Effect, Layer, pipe, Record } from "effect";
import type { Block } from "./Block";
import { GenesisBlock } from "./Block";
import { Blockchain } from "./Blockchain";

export class BlockchainPersistenceError extends Data.TaggedError("BlockchainPersistenceError")<{
  reason: string;
  cause: unknown;
}> {}

export interface BlockchainRepository {
  readonly getBlockchain: () => Effect.Effect<Blockchain>;
  readonly addTransactionToPool: (
    transaction: Transaction
  ) => Effect.Effect<Blockchain, BlockchainPersistenceError>;
  readonly addBlock: (block: Block) => Effect.Effect<Blockchain, BlockchainPersistenceError>;
  readonly clearMinedTransactions: (
    transactionIds: ReadonlyArray<Transaction["id"]>
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
}
