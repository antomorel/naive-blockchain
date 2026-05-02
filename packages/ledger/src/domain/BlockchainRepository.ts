import type { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Context, Effect, Layer, pipe, Record } from "effect";
import type { Block } from "./Block";
import { GenesisBlock } from "./Block";
import { Blockchain } from "./Blockchain";

export interface BlockchainRepository {
  readonly getBlockchain: () => Effect.Effect<Blockchain>;
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
    genesisBlockHash: GenesisBlock.hash
  });

  getBlockchain = () => Effect.succeed(this.blockchain);
}
