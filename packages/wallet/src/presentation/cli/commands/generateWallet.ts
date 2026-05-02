import { Console, Effect, Schema } from "effect";
import { Command } from "effect/unstable/cli";
import * as WalletKeyPairService from "../../../services/crypto/WalletKeyPairService.js";

const toBase64 = Schema.encodeSync(Schema.Uint8ArrayFromBase64);

export const generateWalletCommand = Command.make("generate-wallet", {}, () =>
  Effect.gen(function* () {
    const { address, publicKey, privateKey } = yield* WalletKeyPairService.generateKeyPair();

    yield* Console.log("New wallet generated successfully!");
    yield* Console.log("");
    yield* Console.log(`Address:     ${address}`);
    yield* Console.log(`Public Key:  ${toBase64(publicKey)}`);
    yield* Console.log(`Private Key: ${toBase64(privateKey)}`);
    yield* Console.log("");
    yield* Console.log("IMPORTANT: Store your private key securely. It cannot be recovered!");
  })
).pipe(Command.withDescription("Generate a new wallet keypair"));
