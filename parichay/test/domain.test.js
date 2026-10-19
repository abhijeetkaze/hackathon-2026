import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatDate,
  formatHeight,
  formatTime,
  parseDate,
  parseHeight,
  parseTime,
  toAsciiDigits,
  toMarathiDigits,
} from "../web/js/domain/format.js";
import { buildPrompt, normalizeGender, parseModelJson, pickGemmaModel, toBiodata } from "../web/js/domain/extract.js";
import { FIELDS, emptyBiodata } from "../web/js/domain/biodata.js";
import { renderBiodata, sectionsFor } from "../web/js/domain/render.js";

test("digits convert both ways", () => {
  assert.equal(toMarathiDigits("12 March 1997"), "१२ March १९९७");
  assert.equal(toAsciiDigits("१२/०३/१९९७"), "12/03/1997");
});

test("parseDate reads the ways people write birth dates", () => {
  for (const s of ["12 March 1997", "12th March, 1997", "March 12 1997", "12/03/1997", "12-3-1997", "1997-03-12", "१२ मार्च १९९७", "12 mar 1997"]) {
    assert.equal(parseDate(s), "1997-03-12", s);
  }
});

test("parseDate refuses what it can't be sure of", () => {
  for (const s of ["", "next year", "31/02/1997", "12 Smarch 1997", "12/03/2024"]) assert.equal(parseDate(s), "", s);
});

test("formatDate in English and Marathi", () => {
  assert.equal(formatDate("1997-03-12", "en"), "12 March 1997");
  assert.equal(formatDate("1997-03-12", "mr"), "१२ मार्च १९९७");
  assert.equal(formatDate("", "mr"), "");
});

test("parseTime understands Marathi parts of the day", () => {
  assert.equal(parseTime("sakali 6:40"), "06:40");
  assert.equal(parseTime("सकाळी ६.४०"), "06:40");
  assert.equal(parseTime("sandhyakali 6.40"), "18:40");
  assert.equal(parseTime("dupari 12:15"), "12:15");
  assert.equal(parseTime("ratri 10:05"), "22:05");
  assert.equal(parseTime("ratri 2:30"), "02:30");
  assert.equal(parseTime("2:30 pm"), "14:30");
  assert.equal(parseTime("7 am"), "07:00");
  assert.equal(parseTime("18:40"), "18:40");
  assert.equal(parseTime("morning"), "");
  assert.equal(parseTime("25:00"), "");
});

test("formatTime", () => {
  assert.equal(formatTime("06:40", "en"), "6:40 AM");
  assert.equal(formatTime("18:40", "en"), "6:40 PM");
  assert.equal(formatTime("06:40", "mr"), "सकाळी ६:४० वा.");
  assert.equal(formatTime("21:10", "mr"), "रात्री ९:१० वा.");
});

test("parseHeight", () => {
  assert.equal(parseHeight(`5'9"`), 175);
  assert.equal(parseHeight("5 ft 9 in"), 175);
  assert.equal(parseHeight("5.9"), 175);
  assert.equal(parseHeight("175 cm"), 175);
  assert.equal(parseHeight("५ फूट ९ इंच"), 175);
  assert.equal(parseHeight("5 feet"), 152);
  assert.equal(parseHeight("tall"), 0);
  assert.equal(parseHeight("9 ft"), 0);
});

test("formatHeight", () => {
  assert.equal(formatHeight(175, "en"), "5 ft 9 in (175 cm)");
  assert.equal(formatHeight(175, "mr"), "५ फूट ९ इंच");
  assert.equal(formatHeight(0, "en"), "");
});

test("parseModelJson tolerates fences, chatter and trailing commas", () => {
  assert.deepEqual(parseModelJson('Sure!\n```json\n{"a": "1",}\n```'), { a: "1" });
  assert.throws(() => parseModelJson("I can't help"), /didn't return/);
  assert.throws(() => parseModelJson("{not json}"), /valid JSON/);
});

test("normalizeGender", () => {
  assert.equal(normalizeGender("mulga"), "male");
  assert.equal(normalizeGender("Female"), "female");
  assert.equal(normalizeGender("मुलगी"), "female");
  assert.equal(normalizeGender(""), "");
});

test("toBiodata converts in code and flags what needs a human look", () => {
  const { biodata, check } = toBiodata({
    gender: "mulga",
    fullName: "Rohan Suresh Patil",
    fullNameMr: "रोहन सुरेश पाटील",
    birthDate: "12 March 1997",
    birthTime: "sakali 6:40",
    height: "5'9\"",
    education: "  BE Mechanical  ",
    income: "N/A",
    siblings: ["one sister, married"],
    unknownKey: "ignored",
    birthPlace: null,
  });
  assert.equal(biodata.gender, "male");
  assert.equal(biodata.birthDate, "1997-03-12");
  assert.equal(biodata.birthTime, "06:40");
  assert.equal(biodata.height, "175");
  assert.equal(biodata.education, "BE Mechanical");
  assert.equal(biodata.income, "");
  assert.equal(biodata.siblings, "one sister, married");
  assert.equal(biodata.birthPlace, "");
  assert.equal("unknownKey" in biodata, false);
  assert.deepEqual(check, ["fullNameMr"]);
});

test("toBiodata flags unreadable dates instead of guessing", () => {
  const { biodata, check } = toBiodata({ birthDate: "holi 97", birthTime: "early", height: "average" });
  assert.equal(biodata.birthDate, "");
  assert.deepEqual(check.sort(), ["birthDate", "birthTime", "height"]);
});

test("toBiodata survives garbage", () => {
  assert.deepEqual(toBiodata(null).biodata, emptyBiodata());
});

test("buildPrompt asks for every field and includes the text", () => {
  const p = buildPrompt("  mulga, Rohan  ");
  for (const f of FIELDS) assert.ok(p.includes(`"${f.key}"`), f.key);
  assert.ok(p.endsWith("mulga, Rohan"));
});

test("pickGemmaModel prefers f16 Gemma 2 2B and falls back to f32", () => {
  const ids = ["gemma-2-2b-it-q4f16_1-MLC", "gemma-2-2b-it-q4f32_1-MLC", "gemma3-1b-it-q4f16_1-MLC"];
  assert.equal(pickGemmaModel(ids, { supportsF16: true }), "gemma-2-2b-it-q4f16_1-MLC");
  assert.equal(pickGemmaModel(ids, { supportsF16: false }), "gemma-2-2b-it-q4f32_1-MLC");
  assert.equal(pickGemmaModel(["gemma3-1b-it-q4f16_1-MLC"], { supportsF16: true }), null);
});

function sample() {
  return {
    ...emptyBiodata(),
    gender: "male",
    fullName: "Rohan Suresh Patil",
    fullNameMr: "रोहन सुरेश पाटील",
    birthDate: "1997-03-12",
    birthTime: "06:40",
    height: "175",
    education: "BE Mechanical, COEP 2019",
    contact: "98220 12345",
  };
}

test("empty fields and empty sections are left off the sheet", () => {
  const sections = sectionsFor(sample(), "en");
  assert.deepEqual(sections.map((s) => s.id), ["personal", "work", "contact"]);
  assert.ok(!renderBiodata(sample(), "modern").includes("Gotra"));
});

test("Marathi layout uses fixed labels, Devanagari names and digits, but keeps phone digits", () => {
  const html = renderBiodata(sample(), "traditional");
  assert.ok(html.includes("परिचय पत्र"));
  assert.ok(html.includes("रोहन सुरेश पाटील"));
  assert.ok(html.includes("१२ मार्च १९९७"));
  assert.ok(html.includes("सकाळी ६:४० वा."));
  assert.ok(html.includes("COEP २०१९"));
  assert.ok(html.includes("98220 12345"));
  assert.ok(html.includes("॥ श्री गणेशाय नमः ॥"));
});

test("Bilingual layout shows both labels and both scripts", () => {
  const html = renderBiodata(sample(), "bilingual");
  assert.ok(html.includes("जन्म तारीख / Date of birth"));
  assert.ok(html.includes("12 March 1997 (१२ मार्च १९९७)"));
  assert.ok(html.includes("Rohan Suresh Patil (रोहन सुरेश पाटील)"));
});

test("values are escaped", () => {
  const html = renderBiodata({ ...sample(), education: "<script>x</script>" }, "modern");
  assert.ok(!html.includes("<script>x"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("an empty biodata renders a placeholder, not an empty page", () => {
  assert.ok(renderBiodata(emptyBiodata(), "modern").includes("Your details will appear here."));
});
