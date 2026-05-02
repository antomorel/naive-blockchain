import { Address } from "@blockchain/core/primitives/Address";
import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { Effect } from "effect";
import { KeyPair } from "../../domain/KeyPair/KeyPair.js";
import { PrivateKey } from "../../domain/KeyPair/PrivateKey.js";

ed.hashes.sha512 = sha512;

export const generatePrivateKey = () =>
  Effect.sync(() => {
    const privateKey = ed.utils.randomSecretKey();
    return PrivateKey.make(privateKey);
  });

export const derivePublicKey = (privateKey: PrivateKey) =>
  Effect.promise(async () => {
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    return PublicKey.make(publicKey);
  });

export const derivePublicKeySync = (privateKey: PrivateKey) => {
  const publicKey = ed.getPublicKey(privateKey);
  return PublicKey.make(publicKey);
};

export const deriveAddress = (publicKey: PublicKey) =>
  Effect.sync(() => {
    const hash = sha256(publicKey);
    const addressBytes = hash.slice(0, 20);
    const address = "0x" + bytesToHex(addressBytes);
    return Address.make(address);
  });

export const generateKeyPair = () =>
  Effect.gen(function* () {
    const privateKey = yield* generatePrivateKey();
    const publicKey = yield* derivePublicKey(privateKey);
    const address = yield* deriveAddress(publicKey);

    return KeyPair.make({ privateKey, publicKey, address });
  });

export const keyPairFromPrivateKey = (privateKey: PrivateKey) =>
  Effect.gen(function* () {
    const publicKey = yield* derivePublicKey(privateKey);
    const address = yield* deriveAddress(publicKey);

    return KeyPair.make({ privateKey, publicKey, address });
  });
