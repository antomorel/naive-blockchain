import { type Address } from "@blockchain/core/primitives/Address";
import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import { Signature } from "@blockchain/core/primitives/Signature";
import { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { makeTransactionId } from "@blockchain/core/Transaction/makeTransactionId";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Array, Data, Effect } from "effect";
import { Blockchain } from "../../domain/Blockchain.js";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";
import { COINBASE_AMOUNT } from "../../domain/constants.js";
import { MinerService } from "../../domain/Miner.js";
import { UTXOSet } from "../../domain/UTXOSet.js";

export class NoTransactionsToMineError extends Data.TaggedError("NoTransactionsToMineError")<{}> {}

export class MiningError extends Data.TaggedError("MiningError")<{
  reason: string;
  cause?: unknown;
}> {}

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

const updateUTXOSet = (transactions: ReadonlyArray<Transaction>) =>
  Effect.gen(function* () {
    const { add, remove } = yield* UTXOSet;

    const consumedUtxos = Array.flatMap(transactions, (tx) =>
      Array.filter(tx.inputs, (input) => input.txOutputId !== "")
    );

    yield* remove(consumedUtxos);

    const newUtxos = Array.flatMap(transactions, (tx) =>
      Array.map(tx.outputs, (output, index) => ({
        txOutputId: tx.id,
        txOutputIndex: TxOutputIndex.make(index),
        address: output.address,
        amount: output.amount
      }))
    );

    yield* add(newUtxos);
  });

export const mineNextBlock = (minerAddress: Address) =>
  Effect.gen(function* () {
    const { mineNext } = yield* MinerService;
    const { getBlockchain, addBlock, clearMinedTransactions } = yield* BlockchainRepository;

    const blockchain = yield* getBlockchain();
    const previousBlock = yield* Blockchain.getLatestBlock(blockchain);

    const mempool = blockchain.mempool;
    const coinbaseTx = yield* createCoinbaseTransaction(minerAddress, previousBlock.height + 1);
    const allTransactions = Array.prepend(mempool, coinbaseTx);

    const minedBlock = yield* mineNext(previousBlock, allTransactions);

    yield* addBlock(minedBlock);
    yield* updateUTXOSet(allTransactions);
    yield* clearMinedTransactions(Array.map(mempool, (tx) => tx.id));

    yield* Effect.logInfo(`Mined block ${minedBlock.height} with hash ${minedBlock.hash}`);

    return minedBlock;
  });
