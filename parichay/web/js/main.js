// Wiring: the form, the on-device model, the live preview and printing.
// State lives in memory only. Nothing is saved to storage or sent over the network.

import { FIELDS, emptyBiodata } from "./domain/biodata.js";
import { buildPrompt, parseModelJson, toBiodata } from "./domain/extract.js";
import { formatHeight } from "./domain/format.js";
import { LAYOUTS, layoutAllowed, renderBiodata } from "./domain/render.js";
import { DEMO_KEYS, PLANS, verifyKey } from "./domain/licence.js";
import { gemma, unsupportedReason } from "./adapters/gemma.js";

/** Where "How to buy a plan" points. Change this to your WhatsApp or contact page. */
const BUY_URL = "https://github.com/abhijeetkaze/hackathon-2026/tree/main/parichay#plans";
const STORE_KEY = "parichay.business"; // licence key + shop phone only; never family details

const EXAMPLE = `Mulga. Naav Rohan Suresh Patil. Janma 12 March 1997, sakali 6:40, Pune. Uchi 5'9".
BE Mechanical, COEP 2019. Tata Motors Pimpri madhe Senior Engineer.
Vadil Suresh Patil, MSEB madhun retired. Aai Sunita Patil, gruhini. Ek bahin, vivahit, Pune.
Mamkul Jadhav, Satara. Mool gaav Wai. Gotra Kashyap, kuldaivat Khandoba (Jejuri), rashi Mesh.
Patta: Flat 12, Sai Residency, Kothrud, Pune 411038. Sampark 98220 12345.
Apeksha: shikshit, Pune madhe naukari.`;

const $ = (id) => document.getElementById(id);
const state = { biodata: emptyBiodata(), check: new Set(), layout: "traditional", photoUrl: "", licence: null, phone: "", memberNo: "" };
const model = gemma();

// ── form ─────────────────────────────────────────────────────────────────────

function input(key, kind, labelText, extraClass = "") {
  const wrap = document.createElement("label");
  wrap.className = `field ${extraClass}`.trim();
  wrap.dataset.key = key;
  const span = document.createElement("span");
  span.textContent = labelText;
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = "check";
  span.append(" ", chip);
  let el;
  if (kind === "long") {
    el = document.createElement("textarea");
    el.rows = 2;
  } else {
    el = document.createElement("input");
    el.type = kind === "date" ? "date" : kind === "time" ? "time" : kind === "height" ? "number" : "text";
    if (kind === "height") Object.assign(el, { min: 120, max: 220, placeholder: "cm" });
  }
  el.name = key;
  if (extraClass === "mr") el.lang = "mr";
  wrap.append(span, el);
  if (kind === "height") {
    const hint = document.createElement("small");
    hint.className = "height-hint";
    wrap.append(hint);
  }
  return wrap;
}

function buildForm() {
  const form = $("form");
  const gender = document.createElement("label");
  gender.className = "field";
  gender.innerHTML = `<span>For a</span><select name="gender"><option value="">—</option><option value="male">Groom (मुलगा)</option><option value="female">Bride (मुलगी)</option></select>`;
  form.append(gender);
  for (const f of FIELDS) {
    if (f.kind === "name") {
      const pair = document.createElement("div");
      pair.className = "pair";
      pair.append(input(f.key, "text", f.en), input(f.key + "Mr", "text", f.mr, "mr"));
      form.append(pair);
    } else {
      form.append(input(f.key, f.kind, f.en));
    }
  }
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.name) return;
    state.biodata[el.name] = el.value.trim();
    state.check.delete(el.name);
    syncChecks();
    render();
  });
}

function fillForm() {
  const form = $("form");
  for (const [key, value] of Object.entries(state.biodata)) {
    const el = form.elements.namedItem(key);
    if (el) el.value = value;
  }
  syncChecks();
}

function syncChecks() {
  for (const wrap of $("form").querySelectorAll(".field[data-key]")) {
    wrap.classList.toggle("needs-check", state.check.has(wrap.dataset.key));
  }
  const cm = Number(state.biodata.height) || 0;
  const hint = $("form").querySelector(".height-hint");
  if (hint) hint.textContent = cm ? formatHeight(cm, "en") : "";
}

// ── Gemma ────────────────────────────────────────────────────────────────────

function status(text, kind = "") {
  const el = $("aiStatus");
  el.textContent = text;
  el.dataset.kind = kind;
}

function progress(value) {
  const bar = $("aiProgress");
  bar.hidden = value === null;
  if (value !== null) bar.value = value;
}

async function fillWithGemma() {
  const text = $("freeText").value.trim();
  if (!text) return status("Write a few details first, or try the example.", "warn");
  const reason = unsupportedReason();
  if (reason) return status(reason, "warn");

  const btn = $("fillBtn");
  btn.disabled = true;
  try {
    const cached = await model.isCached();
    status(cached ? "Starting Gemma…" : "Downloading Gemma once (about 1.5 GB, use Wi-Fi). After this it works offline.");
    await model.load((p) => progress(p));
    progress(null);
    status("Reading your details on this phone…");
    const started = performance.now();
    const reply = await model.complete(buildPrompt(text));
    const { biodata, check } = toBiodata(parseModelJson(reply));
    // Merge: what Gemma found fills in, anything it didn't find keeps what you typed.
    for (const [k, v] of Object.entries(biodata)) if (v) state.biodata[k] = v;
    state.check = new Set(check);
    fillForm();
    render();
    const secs = ((performance.now() - started) / 1000).toFixed(1);
    const found = Object.values(biodata).filter(Boolean).length;
    status(`Filled ${found} fields in ${secs}s, on this device. Please check them below.`, "ok");
  } catch (e) {
    progress(null);
    console.error(e);
    status(`${e instanceof Error ? e.message : String(e)} You can still fill the form by hand.`, "warn");
  } finally {
    btn.disabled = false;
  }
}

// ── layout, photo, preview ───────────────────────────────────────────────────

function buildLayouts() {
  const box = $("layouts");
  for (const l of LAYOUTS) {
    const label = document.createElement("label");
    label.className = "layout-option";
    label.dataset.paid = l.paid ? "1" : "";
    label.innerHTML = `<input type="radio" name="layout" value="${l.id}"${l.id === state.layout ? " checked" : ""}><span>${l.name}</span>${l.paid ? '<small class="lock">Shop plan</small>' : ""}`;
    box.append(label);
  }
  box.addEventListener("change", (e) => {
    state.layout = e.target.value;
    render();
  });
  syncLayouts();
}

function syncLayouts() {
  for (const label of $("layouts").querySelectorAll(".layout-option")) {
    const radio = label.querySelector("input");
    const allowed = layoutAllowed(radio.value, state.licence);
    radio.disabled = !allowed;
    label.classList.toggle("locked", !allowed);
  }
  if (!layoutAllowed(state.layout, state.licence)) {
    state.layout = "traditional";
    $("layouts").querySelector('input[value="traditional"]').checked = true;
  }
}

// ── Shop and Bureau plans ────────────────────────────────────────────────────

function saveBusiness(key) {
  try {
    if (key) localStorage.setItem(STORE_KEY, JSON.stringify({ key, phone: state.phone }));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // private window or storage blocked: the plan still works until the page is closed
  }
}

function loadBusiness() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
  } catch {
    return null;
  }
}

function business() {
  return state.licence ? { ...state.licence, phone: state.phone, memberNo: state.memberNo } : null;
}

function showPlan() {
  const lic = state.licence;
  $("planPitch").hidden = Boolean(lic);
  $("planActive").hidden = !lic;
  if (lic) {
    const until = lic.until ? `, valid until ${lic.until}` : "";
    $("planName").textContent = `✓ ${PLANS[lic.plan].en} · ${lic.name}${until}`;
    $("bizPhone").value = state.phone;
    $("memberWrap").hidden = lic.plan !== "bureau";
  }
  syncLayouts();
  render();
}

async function activate(key, { quiet = false } = {}) {
  const planStatus = $("planStatus");
  try {
    state.licence = await verifyKey(key, { today: new Date().toISOString().slice(0, 10) });
    saveBusiness(key.trim());
    planStatus.textContent = quiet ? "" : "Activated on this phone. Your name is now on every biodata, and the Royal layout is open.";
    planStatus.dataset.kind = "ok";
  } catch (e) {
    state.licence = null;
    planStatus.textContent = e instanceof Error ? e.message : String(e);
    planStatus.dataset.kind = "warn";
  }
  showPlan();
}

function wirePlans() {
  $("buyLink").href = BUY_URL;
  $("activateBtn").addEventListener("click", () => activate($("licenceKey").value));
  $("demoShopBtn").addEventListener("click", () => {
    $("licenceKey").value = DEMO_KEYS.shop;
    activate(DEMO_KEYS.shop);
  });
  $("demoBureauBtn").addEventListener("click", () => {
    $("licenceKey").value = DEMO_KEYS.bureau;
    activate(DEMO_KEYS.bureau);
  });
  $("removeKeyBtn").addEventListener("click", () => {
    state.licence = null;
    state.phone = "";
    state.memberNo = "";
    $("memberNo").value = "";
    $("licenceKey").value = "";
    saveBusiness(null);
    $("planStatus").textContent = "Key removed from this phone.";
    $("planStatus").dataset.kind = "";
    showPlan();
  });
  $("bizPhone").addEventListener("input", (e) => {
    state.phone = e.target.value.trim();
    const saved = loadBusiness();
    if (saved?.key) saveBusiness(saved.key);
    render();
  });
  $("memberNo").addEventListener("input", (e) => {
    state.memberNo = e.target.value.trim();
    render();
  });
  const saved = loadBusiness();
  if (saved?.key) {
    state.phone = saved.phone ?? "";
    activate(saved.key, { quiet: true });
  }
}

function setPhoto(file) {
  if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
  state.photoUrl = file ? URL.createObjectURL(file) : "";
  $("removePhoto").hidden = !state.photoUrl;
  if (!file) $("photo").value = "";
  render();
}

function render() {
  $("sheet").innerHTML = renderBiodata(state.biodata, state.layout, state.photoUrl, business());
}

// ── start ────────────────────────────────────────────────────────────────────

buildForm();
buildLayouts();
wirePlans();
render();

$("exampleBtn").addEventListener("click", () => {
  $("freeText").value = EXAMPLE;
  $("freeText").focus();
});
$("fillBtn").addEventListener("click", fillWithGemma);
$("photo").addEventListener("change", (e) => setPhoto(e.target.files?.[0] ?? null));
$("removePhoto").addEventListener("click", () => setPhoto(null));
$("printBtn").addEventListener("click", () => window.print());

const reason = unsupportedReason();
if (reason) status(reason, "warn");

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Service worker not registered", e));
}
