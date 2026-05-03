# Build Your Own Blockchain

A naive blockchain implementation highly inspired by the projects in [build-your-own-x](https://github.com/codecrafters-io/build-your-own-x#build-your-own-blockchain--cryptocurrency).
It was a sandbox for getting more familiar with UTXO-based blockchains and [Effect smol](https://github.com/Effect-TS/effect-smol).

## Getting Started

### Installation

```bash
pnpm install
```

### Running the Ledger Node

```bash
cd packages/ledger
pnpm dev
```

### Running the Explorer

```bash
cd packages/explorer
pnpm dev
```

The explorer will be available at http://localhost:4200

## Testing Transactions

To test sending transactions, you first need a wallet and some coins from mining.

### 1. Generate a Wallet

From the `packages/wallet` directory:

```bash
pnpm cli generate-wallet
```

This will output a new address and private key. You can store the keys in the `keys/` folder (gitignored).

### 2. Configure Mining

Set your wallet address as the miner address in `packages/ledger/.env.development`:

```env
LEDGER_SHOULD_MINE=true
LEDGER_MINER_ADDRESS=<your-generated-address>
```

### 3. Start Mining

Run the ledger node. It will start mining blocks and your address will receive coinbase rewards.

### 4. Send Transactions

Once you have a balance, you can send transactions using the CLI:

```bash
pnpm cli send --to <recipient-address> --amount <amount> --private-key <your-private-key>
```

You can check your balance with:

```bash
pnpm cli balance --address <your-address>
```
