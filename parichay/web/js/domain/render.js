// Biodata → printable HTML. Pure (returns a string), so every layout is testable in Node.

import { FIELDS, SECTIONS, TITLE } from "./biodata.js";
import { formatDate, formatHeight, formatTime, toMarathiDigits } from "./format.js";

export const LAYOUTS = [
  { id: "traditional", name: "Traditional (Marathi)", lang: "mr" },
  { id: "modern", name: "Modern (English)", lang: "en" },
  { id: "bilingual", name: "Bilingual", lang: "both" },
  { id: "royal", name: "Royal (Marathi)", lang: "mr", paid: true },
];

/** Paid layouts need a Shop or Bureau licence. */
export function layoutAllowed(layoutId, licence) {
  const layout = LAYOUTS.find((l) => l.id === layoutId);
  return Boolean(layout) && (!layout.paid || Boolean(licence));
}

const PREPARED = { mr: "तयार करणारे", en: "Prepared by", both: "तयार करणारे / Prepared by" };
const MEMBER = { mr: "सभासद क्र.", en: "Member no.", both: "सभासद क्र. / Member no." };

/**
 * The licensed business's lines on the sheet: a "prepared by" footer for every plan, and for a
 * bureau a header strip with its name and the member's number. Empty strings without a licence.
 */
export function businessLines(business, lang) {
  if (!business?.plan || !business.name) return { header: "", footer: "" };
  const phone = business.phone?.trim();
  const footer = `${PREPARED[lang]} : ${business.name}${phone ? ` · ${phone}` : ""}`;
  let header = "";
  if (business.plan === "bureau") {
    const no = business.memberNo?.trim();
    const memberNo = no ? (lang === "mr" ? toMarathiDigits(no) : no) : "";
    header = memberNo ? `${business.name} · ${MEMBER[lang]} ${memberNo}` : business.name;
  }
  return { header, footer };
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** One field's printed value in one language, or "" if there's nothing to print. */
export function fieldValue(field, b, lang) {
  const v = b[field.key] ?? "";
  switch (field.kind) {
    case "date":
      return formatDate(v, lang);
    case "time":
      return formatTime(v, lang);
    case "height":
      return formatHeight(Number(v) || 0, lang);
    case "name":
      return lang === "mr" ? b[field.key + "Mr"] || v : v || b[field.key + "Mr"] || "";
    default:
      // Free text is printed as typed; in Marathi layouts its digits become Devanagari,
      // except phone numbers and emails, which people need to be able to dial and type.
      return lang === "mr" && field.key !== "contact" ? toMarathiDigits(v) : v;
  }
}

function label(field, lang) {
  return lang === "both" ? `${field.mr} / ${field.en}` : field[lang];
}

/** Rows of [label, value] per section, with empty fields and empty sections left out. */
export function sectionsFor(b, lang) {
  const valueLang = lang === "both" ? "en" : lang;
  return SECTIONS.map((s) => ({
    title: lang === "both" ? `${s.mr} / ${s.en}` : s[lang],
    id: s.id,
    rows: FIELDS.filter((f) => f.section === s.id)
      .map((f) => {
        let value = fieldValue(f, b, valueLang);
        if (lang === "both" && f.kind === "name" && b[f.key + "Mr"] && b[f.key]) value = `${b[f.key]} (${b[f.key + "Mr"]})`;
        if (lang === "both" && (f.kind === "date" || f.kind === "time")) {
          const mr = fieldValue(f, b, "mr");
          if (mr && value) value = `${value} (${mr})`;
        }
        return [label(f, lang), value];
      })
      .filter(([, v]) => v),
  })).filter((s) => s.rows.length > 0);
}

/**
 * The full sheet. `photoUrl` is an object URL that never leaves the browser.
 * `business` is { plan, name, phone, memberNo } from a verified licence, or null.
 */
export function renderBiodata(b, layoutId, photoUrl = "", business = null) {
  const wanted = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const layout = layoutAllowed(wanted.id, business) ? wanted : LAYOUTS[0];
  const lang = layout.lang;
  const lines = businessLines(business, lang);
  const bureauStrip = lines.header ? `<p class="bureau">${escapeHtml(lines.header)}</p>` : "";
  const prepared = lines.footer ? `<footer class="prepared">${escapeHtml(lines.footer)}</footer>` : "";
  const nameLang = lang === "both" ? "en" : lang;
  const name = fieldValue(FIELDS[0], b, nameLang);
  const subName = lang === "both" ? b.fullNameMr : "";
  const title = lang === "both" ? `${TITLE.mr} · ${TITLE.en}` : TITLE[lang];
  const blessing = layout.id === "modern" ? "" : `<p class="blessing">॥ श्री गणेशाय नमः ॥</p>`;
  const photo = photoUrl ? `<img class="photo" src="${escapeHtml(photoUrl)}" alt="">` : "";

  const sections = sectionsFor(b, lang)
    .map(
      (s) =>
        `<section class="block block-${s.id}"><h3>${escapeHtml(s.title)}</h3><dl>${s.rows
          .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
          .join("")}</dl></section>`,
    )
    .join("");

  return `<article class="sheet sheet-${layout.id}" lang="${lang === "en" ? "en" : "mr"}">
<div class="frame">
${bureauStrip}
${blessing}
<header class="head${photo ? " has-photo" : ""}">
<div class="who"><p class="title">${escapeHtml(title)}</p>${name ? `<h2 class="name">${escapeHtml(name)}</h2>` : ""}${
    subName ? `<p class="subname">${escapeHtml(subName)}</p>` : ""
  }</div>
${photo}
</header>
${sections || `<p class="placeholder">${lang === "en" ? "Your details will appear here." : "तुमची माहिती इथे दिसेल."}</p>`}
${prepared}
</div>
</article>`;
}
