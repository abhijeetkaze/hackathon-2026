// Shop and Bureau licence keys, checked offline.
//
// A key is "PRCH1.<payload>.<signature>", both parts base64url. The payload is JSON:
//   { "plan": "shop" | "bureau", "name": "Sai Prints", "until": "2027-10-19" (bureau only) }
// It's signed with Ed25519 by scripts/make-key.mjs, using a private key that never enters this repo.
// The app only holds the public key below, so it can check a key with no network at all.
//
// The code is open, so anyone can remove this check and build their own copy. That's fine: a shop
// pays for its name on the page, setup and support, not for the lock.

export const PUBLIC_KEY_B64 = "48ZP_TEz8fuAyxIRotIIi6z1XK3QomaGLL1GPFiPmLY";

export const PLANS = {
  shop: { en: "Shop plan", price: "₹499 once" },
  bureau: { en: "Bureau plan", price: "₹1,999 a year" },
};

export function b64urlToBytes(s) {
  const b64 = String(s).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Splits and decodes a key without checking the signature. Throws a readable error. */
export function decodeKey(key) {
  const parts = String(key ?? "").trim().split(".");
  if (parts.length !== 3 || parts[0] !== "PRCH1") throw new Error("That isn't a Parichay key.");
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch {
    throw new Error("That key is damaged. Copy it again from the message.");
  }
  return { payload, signed: new TextEncoder().encode(`${parts[0]}.${parts[1]}`), signature: b64urlToBytes(parts[2]) };
}

/**
 * Checks a key and returns the licence: { plan, name, until }.
 * `today` is "YYYY-MM-DD"; `publicKey` is a base64url raw Ed25519 key (tests pass their own).
 */
export async function verifyKey(key, { today, publicKey = PUBLIC_KEY_B64 } = {}) {
  const { payload, signed, signature } = decodeKey(key);
  const pub = await crypto.subtle.importKey("raw", b64urlToBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "Ed25519" }, pub, signature, signed);
  if (!ok) throw new Error("That key isn't valid.");
  const plan = payload.plan;
  const name = String(payload.name ?? "").trim();
  if (!(plan in PLANS) || !name) throw new Error("That key isn't valid.");
  const until = payload.until ? String(payload.until) : "";
  if (until && today && until < today) throw new Error(`This ${PLANS[plan].en.toLowerCase()} ended on ${until}. Renew it to keep your name on biodatas.`);
  return { plan, name, until };
}

/** Real keys for two made-up businesses, so anyone can try the paid plans from the app. */
export const DEMO_KEYS = {
  shop: "PRCH1.eyJwbGFuIjoic2hvcCIsIm5hbWUiOiJEZW1vIFByaW50cywgS290aHJ1ZCJ9.eQAJZtuAM7T2xmsdJZAd1ARMLlwGPFHbUJaTnRUSltB4t8hV8te2-PsXu4iyRZIeDrlDYcpoVskLkndadsxCBA",
  bureau: "PRCH1.eyJwbGFuIjoiYnVyZWF1IiwibmFtZSI6IkRlbW8gVmFkaHUtVmFyIEtlbmRyYSIsInVudGlsIjoiMjAyNy0xMC0xOSJ9.tH6c3_XXM35Upi3qKDAuJiKveIJMLrayp_7Agznl-9gI5WNFWq0jwHkah7wfIcnIzA1vxnz77PMrGiGydKSqBw",
};
