import * as HashService from "@blockchain/core/crypto/HashService";
import { Array, Effect, HashSet, Option, pipe, Record, Stream } from "effect";
import type { Block } from "../../domain/Block.js";
import { Blockchain } from "../../domain/Blockchain.js";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";
import { NetworkService } from "../../domain/network/NetworkService.js";
import { UTXOSet } from "../../domain/UTXOSet.js";
import * as BlockService from "../../infrastructure/BlockService.js";
import { ApplyBlockWorkflow } from "../Blockchain/ApplyBlockWorkflow.js";

const validateAndApplyBlock = (block: Block) =>
  Effect.gen(function* () {
    const blockchain = yield* BlockchainRepository.use(({ getBlockchain }) => getBlockchain());

    if (Record.has(blockchain.blocks, block.hash)) {
      yield* Effect.logDebug(`Ignoring duplicate block: ${block.hash}`);
      return;
    }

    const latestBlock = yield* Blockchain.getLatestBlock(blockchain);

    if (
      Option.isNone(block.header.previousHash) ||
      block.header.previousHash.value !== latestBlock.hash
    ) {
      yield* Effect.logWarning(
        `Received orphan block at height ${block.height}, expected parent ${latestBlock.hash}`
      );
      return;
    }

    const isValid = yield* BlockService.isNextValid(latestBlock, block);
    if (!isValid) {
      yield* Effect.logWarning(`Rejected invalid block: ${block.hash}`);
      return;
    }

    if (!HashService.hashMatchesDifficulty(block.hash, latestBlock.header.difficulty)) {
      yield* Effect.logWarning(`Block ${block.hash} does not meet difficulty requirement`);
      return;
    }

    const consumedUtxos = yield* UTXOSet.use(({ findMany }) =>
      findMany(
        Array.flatMap(block.transactions, (tx) =>
          Array.filter(tx.inputs, (input) => input.txOutputId !== "")
        )
      )
    );

    const blockTxIds = pipe(
      block.transactions,
      Array.map((tx) => tx.id),
      HashSet.fromIterable
    );

    const mempoolToRestore = Array.filter(blockchain.mempool, (tx) =>
      HashSet.has(blockTxIds, tx.id)
    );

    yield* ApplyBlockWorkflow.execute({
      block,
      consumedUtxos,
      mempoolToRestore
    });

    yield* Effect.logInfo(`Received and applied block: height=${block.height}, hash=${block.hash}`);
  });

export const listenForIncomingBlocks = () =>
  Effect.gen(function* () {
    const networkService = yield* NetworkService;

    yield* networkService.onBlockReceived.pipe(
      Stream.runForEach((block) =>
        validateAndApplyBlock(block).pipe(
          Effect.catch((error) =>
            Effect.logError(`Error processing incoming block: ${JSON.stringify(error, null, 2)}`)
          )
        )
      )
    );
  });
