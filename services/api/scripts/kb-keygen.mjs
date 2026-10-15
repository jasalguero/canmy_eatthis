#!/usr/bin/env node
// Makes the Ed25519 key pair that signs the KB the Worker serves (docs/02 D38).
//
//   private key -> `wrangler secret put KB_SIGNING_KEY` (paste it; never commit it, AGENTS.md #6)
//   public key  -> EXPO_PUBLIC_KB_PUBLIC_KEY for the app build (eas.json env); not a secret
//
// Prints both and writes nothing to disk.
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64');

console.log(`KB_SIGNING_KEY (secret):              ${pkcs8}`);
console.log(`EXPO_PUBLIC_KB_PUBLIC_KEY (app, public): ${raw}`);
