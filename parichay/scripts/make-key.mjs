#!/usr/bin/env node
// Makes Shop and Bureau licence keys. Run on your own machine only.
//
//   node scripts/make-key.mjs --init
//       creates ~/.parichay/signing-key.pem (keep it secret, back it up) and prints the public key
//       to put in web/js/domain/licence.js
//   node scripts/make-key.mjs --plan shop --name "Sai Prints, Kothrud"
//   node scripts/make-key.mjs --plan bureau --name "Shubh Mangal Vadhu-Var Kendra" [--until 2027-10-19]
//
// The private key path can be overridden with PARICHAY_SIGNING_KEY=/path/to/key.pem.

import { createPrivateKey, generateKeyPairSync, sign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const keyPath = process.env.PARICHAY_SIGNING_KEY ?? join(homedir(), ".parichay", "signing-key.pem");
const b64url = (buf) => Buffer.from(buf).toString("base64url");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv.includes("--init")) {
  if (existsSync(keyPath)) {
    console.error(`${keyPath} already exists. Not overwriting it: every key you've sold depends on it.`);
    process.exit(1);
  }
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const raw = publicKey.export({ format: "jwk" }).x; // raw 32 bytes, base64url
  console.log(`Private key: ${keyPath}  (keep it secret, back it up)`);
  console.log(`Public key for web/js/domain/licence.js: ${raw}`);
  process.exit(0);
}

const plan = arg("plan");
const name = arg("name")?.trim();
if (!["shop", "bureau"].includes(plan) || !name) {
  console.error('Usage: make-key.mjs --plan shop|bureau --name "Business name" [--until YYYY-MM-DD]');
  process.exit(1);
}
let until = arg("until");
if (plan === "bureau" && !until) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  until = d.toISOString().slice(0, 10);
}
if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
  console.error("--until must be YYYY-MM-DD");
  process.exit(1);
}

const privateKey = createPrivateKey(readFileSync(keyPath));
const payload = b64url(JSON.stringify(until ? { plan, name, until } : { plan, name }));
const signed = `PRCH1.${payload}`;
console.log(`${signed}.${b64url(sign(null, Buffer.from(signed), privateKey))}`);
