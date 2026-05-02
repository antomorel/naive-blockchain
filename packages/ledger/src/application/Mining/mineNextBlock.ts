import { type Address } from "@blockchain/core/primitives/Address";
import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import { Signature } from "@blockchain/core/primitives/Signature";
import { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { makeTransactionId } from "@blockchain/core/Transaction/makeTransactionId";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Array, Effect } from "effect";
import { Blockchain } from "../../domain/Blockchain.js";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";
import { COINBASE_AMOUNT } from "../../domain/constants.js";
import { MinerService } from "../../domain/Miner.js";
import { UTXOSet } from "../../domain/UTXOSet.js";
import { UpdateBlockchainAfterMinedBlockWorkflow } from "./UpdateBlockchainAfterMinedBlockWorkflow.js";

const createCoinbaseTransaction = (minerAddress: Address, blockHeight: number) =>
  Effect.gen(function* () {
    const coinbaseInput = {
      txOutputId: TransactionId.make(""),
      txOutputIndex: TxOutputIndex.make(blockHeight),
      signature: Signature.make(new Uint8Array(0)),
      publicKey: PublicKey.make(new Uint8Array(0))
    };

    const coinbaseOutput = {
      address: minerAddress,
      amount: COINBASE_AMOUNT
    };

    const transactionId = yield* makeTransactionId([coinbaseInput], [coinbaseOutput]);

    return new Transaction({
      id: transactionId,
      inputs: [coinbaseInput],
      outputs: [coinbaseOutput]
    });
  });

const collectConsumedUtxos = (transactions: ReadonlyArray<Transaction>) =>
  Effect.gen(function* () {
    const { findMany } = yield* UTXOSet;

    const inputsToConsume = Array.flatMap(transactions, (tx) =>
      Array.filter(tx.inputs, (input) => input.txOutputId !== "")
    );

    return yield* findMany(inputsToConsume);
  });

export const mineNextBlock = Effect.fn("mineNextBlock")(function* (minerAddress: Address) {
  const blockchain = yield* BlockchainRepository.use(({ getBlockchain }) => getBlockchain());
  const previousBlock = yield* Blockchain.getLatestBlock(blockchain);
  const mempool = blockchain.mempool;

  const coinbaseTx = yield* createCoinbaseTransaction(minerAddress, previousBlock.height + 1);
  const allTransactions = Array.prepend(mempool, coinbaseTx);

  const minedBlock = yield* MinerService.use(({ mineNext }) =>
    mineNext(previousBlock, allTransactions)
  );

  const consumedUtxos = yield* collectConsumedUtxos(allTransactions);

  yield* UpdateBlockchainAfterMinedBlockWorkflow.execute({
    minedBlock,
    consumedUtxos,
    mempool,
    allTransactions
  });
});
