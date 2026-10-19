import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";

import { DEMO_KEYS, bytesToB64url, decodeKey, verifyKey } from "../web/js/domain/licence.js";
import { emptyBiodata } from "../web/js/domain/biodata.js";
import { businessLines, layoutAllowed, renderBiodata } from "../web/js/domain/render.js";

// A throwaway signer, the same way scripts/make-key.mjs signs.
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const PUB = publicKey.export({ format: "jwk" }).x;
function makeKey(payload) {
  const signed = `PRCH1.${bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)))}`;
  return `${signed}.${bytesToB64url(sign(null, Buffer.from(signed), privateKey))}`;
}

test("a signed shop key verifies offline and carries the shop's name", async () => {
  const lic = await verifyKey(makeKey({ plan: "shop", name: "Sai Prints" }), { today: "2026-10-19", publicKey: PUB });
  assert.deepEqual(lic, { plan: "shop", name: "Sai Prints", until: "" });
});

test("a tampered key is refused: you can't change the name on someone else's key", async () => {
  const key = makeKey({ plan: "shop", name: "Sai Prints" });
  const [v, , sig] = key.split(".");
  const forged = `${v}.${bytesToB64url(new TextEncoder().encode(JSON.stringify({ plan: "shop", name: "Other Prints" })))}.${sig}`;
  await assert.rejects(verifyKey(forged, { today: "2026-10-19", publicKey: PUB }), /isn't valid/);
});

test("keys signed by someone else are refused", async () => {
  const other = generateKeyPairSync("ed25519").publicKey.export({ format: "jwk" }).x;
  await assert.rejects(verifyKey(makeKey({ plan: "shop", name: "Sai Prints" }), { today: "2026-10-19", publicKey: other }), /isn't valid/);
});

test("a bureau key stops working after its year", async () => {
  const key = makeKey({ plan: "bureau", name: "Shubh Mangal", until: "2026-10-18" });
  await assert.rejects(verifyKey(key, { today: "2026-10-19", publicKey: PUB }), /ended on 2026-10-18/);
  const ok = await verifyKey(key, { today: "2026-10-18", publicKey: PUB });
  assert.equal(ok.plan, "bureau");
});

test("junk is explained, not crashed on", async () => {
  assert.throws(() => decodeKey("hello"), /isn't a Parichay key/);
  assert.throws(() => decodeKey("PRCH1.@@@.x"), /damaged/);
  await assert.rejects(verifyKey(makeKey({ plan: "gold", name: "X" }), { today: "2026-10-19", publicKey: PUB }), /isn't valid/);
});

test("the demo keys in the app verify against the app's real public key", async () => {
  assert.equal((await verifyKey(DEMO_KEYS.shop, { today: "2026-10-19" })).name, "Demo Prints, Kothrud");
  const bureau = await verifyKey(DEMO_KEYS.bureau, { today: "2026-10-19" });
  assert.equal(bureau.plan, "bureau");
});

const b = { ...emptyBiodata(), fullName: "Rohan Patil", fullNameMr: "रोहन पाटील", education: "BE" };

test("the Royal layout needs a plan; without one the sheet falls back to Traditional", () => {
  assert.equal(layoutAllowed("royal", null), false);
  assert.equal(layoutAllowed("royal", { plan: "shop", name: "X" }), true);
  assert.equal(layoutAllowed("modern", null), true);
  assert.ok(renderBiodata(b, "royal").includes("sheet-traditional"));
  assert.ok(renderBiodata(b, "royal", "", { plan: "shop", name: "Sai Prints" }).includes("sheet-royal"));
});

test("a shop's name and number go in the footer, in the layout's language", () => {
  const shop = { plan: "shop", name: "Sai Prints", phone: "98220 00000" };
  assert.ok(renderBiodata(b, "traditional", "", shop).includes("तयार करणारे : Sai Prints · 98220 00000"));
  assert.ok(renderBiodata(b, "modern", "", shop).includes("Prepared by : Sai Prints · 98220 00000"));
  assert.ok(!renderBiodata(b, "modern").includes("Prepared by"));
  assert.equal(businessLines(shop, "en").header, "");
});

test("a bureau gets a header with the member number", () => {
  const bureau = { plan: "bureau", name: "Shubh Mangal", memberNo: "1042" };
  assert.equal(businessLines(bureau, "mr").header, "Shubh Mangal · सभासद क्र. १०४२");
  assert.equal(businessLines(bureau, "en").header, "Shubh Mangal · Member no. 1042");
  assert.equal(businessLines({ ...bureau, memberNo: "" }, "en").header, "Shubh Mangal");
  assert.ok(renderBiodata(b, "modern", "", bureau).includes('<p class="bureau">Shubh Mangal · Member no. 1042</p>'));
});

test("business names are escaped like everything else", () => {
  assert.ok(!renderBiodata(b, "modern", "", { plan: "shop", name: "<b>x</b>" }).includes("<b>x"));
});
