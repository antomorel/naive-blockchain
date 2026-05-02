import { InMemoryBlockchainRepository } from "./domain/BlockchainRepository";
import { InMemoryUTXOSet } from "./domain/UTXOSet";

export const UTXOSetLive = InMemoryUTXOSet.Live;

export const BlockchainRepositoryLive = InMemoryBlockchainRepository.Live;