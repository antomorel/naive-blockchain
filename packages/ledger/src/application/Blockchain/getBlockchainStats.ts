import { DateTime, Duration, Effect, Option, Record } from "effect";
import { Blockchain } from "../../domain/Blockchain.js";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";
import { BLOCK_GENERATION_INTERVAL } from "../../domain/constants.js";

const HOURS_24 = Duration.hours(24);
const MAX_BLOCKS_FOR_AVG = 100;

export const getBlockchainStats = Effect.fn("getBlockchainStats")(function* () {
  const blockchain = yield* BlockchainRepository.use(({ getBlockchain }) => getBlockchain());
  const now = yield* DateTime.now;
  const cutoff24h = DateTime.subtractDuration(now, HOURS_24);

  let transactionsInThePast24Hours = 0;
  const blockIntervals: Duration.Duration[] = [];

  let currentBlock = yield* Blockchain.getLatestBlock(blockchain);
  let blocksProcessed = 0;

  while (Option.isSome(currentBlock.header.previousHash) && blocksProcessed < MAX_BLOCKS_FOR_AVG) {
    const previousBlock = Record.get(blockchain.blocks, currentBlock.header.previousHash.value);

    if (Option.isNone(previousBlock)) break;

    const interval = DateTime.distance(
      previousBlock.value.header.timestamp,
      currentBlock.header.timestamp
    );
    blockIntervals.push(interval);

    if (DateTime.isGreaterThanOrEqualTo(currentBlock.header.timestamp, cutoff24h)) {
      transactionsInThePast24Hours += currentBlock.transactions.length;
    }

    currentBlock = previousBlock.value;
    blocksProcessed++;
  }

  if (DateTime.isGreaterThanOrEqualTo(currentBlock.header.timestamp, cutoff24h)) {
    transactionsInThePast24Hours += currentBlock.transactions.length;
  }

  const avgBlockTime = Duration.divide(
    blockIntervals.reduce((acc, d) => Duration.sum(acc, d), Duration.zero),
    blockIntervals.length
  ).pipe(Option.getOrElse(() => BLOCK_GENERATION_INTERVAL));

  const latestBlock = yield* Blockchain.getLatestBlock(blockchain);

  const avgBlockTimeSeconds = Duration.toSeconds(avgBlockTime);
  const hashrate =
    avgBlockTimeSeconds > 0
      ? Math.floor(2 ** latestBlock.header.difficulty / avgBlockTimeSeconds)
      : 0;

  return { hashrate, transactionsInThePast24Hours, avgBlockTime };
});
