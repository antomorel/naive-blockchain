import { TransactionRpcs } from "./Transaction.js";
import { UTXORpcs } from "./UTXO.js";

export const LedgerRpcs = UTXORpcs.merge(TransactionRpcs);
