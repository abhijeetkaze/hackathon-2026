// Turning free-form text into biodata fields with a small on-device model.
// The model's job is narrow: find each value in the text and copy it. It also proposes
// Devanagari spellings for names. Dates, times and heights are converted in code (format.js).

import { FIELDS, emptyBiodata } from "./biodata.js";
import { parseDate, parseHeight, parseTime } from "./format.js";

/** The keys the model is asked for, with a one-line hint each. */
const ASK = {
  gender: '"male" or "female" (mulga/boy = male, mulgi/girl = female)',
  fullName: "the person's full name, in English letters",
  fullNameMr: "the same name written in Marathi Devanagari script",
  birthDate: "date of birth, copied exactly as written",
  birthTime: "time of birth, copied exactly as written (keep words like sakali/ratri)",
  birthPlace: "place of birth",
  height: "height, copied exactly as written",
  education: "degrees and college",
  occupation: "job title and employer",
  income: "income, only if mentioned",
  fatherName: "father's name",
  fatherNameMr: "father's name in Marathi Devanagari script",
  fatherOccupation: "father's work",
  motherName: "mother's name",
  motherNameMr: "mother's name in Marathi Devanagari script",
  motherOccupation: "mother's work",
  siblings: "brothers and sisters, as written",
  mama: "maternal uncle (mama / mamkul), as written",
  nativePlace: "native village or town",
  gotra: "gotra",
  kuldaivat: "family deity (kuldaivat)",
  rashi: "rashi",
  nakshatra: "nakshatra",
  address: "address",
  contact: "phone numbers or email, copied exactly",
  expectations: "what they expect in a partner",
};

export const ASK_KEYS = Object.keys(ASK);

/** One user message. Gemma's chat template has no system role, so instructions go here. */
export function buildPrompt(text) {
  const keys = ASK_KEYS.map((k) => `  "${k}": ${ASK[k]}`).join("\n");
  return [
    "Read the details below for a marriage biodata. They may be in Marathi, Hindi, English or a mix.",
    "Reply with ONLY one JSON object with these keys:",
    keys,
    'Copy values from the text. If something is not mentioned, use "". Never guess or invent anything.',
    "",
    "Details:",
    String(text).trim(),
  ].join("\n");
}

/** Pulls the first JSON object out of a model reply (fences, chatter and trailing commas tolerated). */
export function parseModelJson(reply) {
  const s = String(reply ?? "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model didn't return any fields.");
  const body = s.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    try {
      return JSON.parse(body.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw new Error("The model's answer wasn't valid JSON.");
    }
  }
}

const MALE = ["male", "boy", "groom", "mulga", "mulaga", "ladka", "मुलगा", "वर", "लड़का"];
const FEMALE = ["female", "girl", "bride", "mulgi", "mulagi", "ladki", "मुलगी", "वधू", "लड़की"];

export function normalizeGender(raw) {
  const s = String(raw ?? "").toLowerCase().trim();
  if (FEMALE.some((w) => s.includes(w))) return "female";
  if (MALE.some((w) => s.includes(w))) return "male";
  return "";
}

function clean(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(clean).filter(Boolean).join(", ");
  if (typeof v === "object") return Object.values(v).map(clean).filter(Boolean).join(", ");
  const s = String(v).trim();
  return /^(n\/?a|none|null|not mentioned|unknown|-)$/i.test(s) ? "" : s;
}

/**
 * Model output → biodata plus the list of fields the person should double-check:
 * every Devanagari name (a spelling proposal), and any date/time/height the code couldn't read.
 */
export function toBiodata(modelJson) {
  const b = emptyBiodata();
  const check = new Set();
  const raw = modelJson && typeof modelJson === "object" ? modelJson : {};
  for (const key of ASK_KEYS) if (key in b) b[key] = clean(raw[key]);
  b.gender = normalizeGender(raw.gender);

  for (const f of FIELDS) {
    const value = b[f.key];
    if (f.kind === "date" && value) {
      b[f.key] = parseDate(value);
      if (!b[f.key]) check.add(f.key);
    }
    if (f.kind === "time" && value) {
      b[f.key] = parseTime(value);
      if (!b[f.key]) check.add(f.key);
    }
    if (f.kind === "height" && value) {
      const cm = parseHeight(value);
      b[f.key] = cm ? String(cm) : "";
      if (!cm) check.add(f.key);
    }
    if (f.kind === "name" && b[f.key + "Mr"]) check.add(f.key + "Mr");
  }
  return { biodata: b, check: [...check] };
}

/** Picks the on-device Gemma build: Gemma 2 2B, f16 when the GPU supports it. */
export function pickGemmaModel(availableIds, { supportsF16 }) {
  const ids = new Set(availableIds);
  const preferred = supportsF16 ? ["gemma-2-2b-it-q4f16_1-MLC", "gemma-2-2b-it-q4f32_1-MLC"] : ["gemma-2-2b-it-q4f32_1-MLC"];
  return preferred.find((id) => ids.has(id)) ?? null;
}
