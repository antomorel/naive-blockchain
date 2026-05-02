import { Array, DateTime, Effect } from "effect";
import sizeof from "object-sizeof";
import type { Block } from "../../domain/Block.js";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";

const getMiner = (block: Block): string => {
  const firstTx = block.transactions[0];
  if (!firstTx) return "Genesis";
  const firstOutput = firstTx.outputs[0];
  if (!firstOutput) return "Unknown";
  return firstOutput.address;
};

export const getBlocks = Effect.fn("getBlocks")(function* ({
  skip,
  take
}: {
  skip: number;
  take: number;
}) {
  const blocks = yield* BlockchainRepository.use(({ getBlocks }) => getBlocks({ skip, take }));

  const now = yield* DateTime.now;

  return Array.map(blocks, (block) => ({
    height: block.height,
    miner: getMiner(block),
    transactions: block.transactions.length,
    size: sizeof(block),
    time: DateTime.distance(block.header.timestamp, now)
  }));
});
