// Deterministic parsing and formatting. The model never produces numbers that get printed:
// it copies the user's words, and these functions turn them into dates, times and heights.

const MR_DIGITS = "०१२३४५६७८९";

/** "1997" → "१९९७". Leaves everything that isn't an ASCII digit alone. */
export function toMarathiDigits(text) {
  return String(text).replace(/[0-9]/g, (d) => MR_DIGITS[Number(d)]);
}

/** "१९९७" → "1997", so Marathi input parses the same as English input. */
export function toAsciiDigits(text) {
  return String(text).replace(/[०-९]/g, (d) => String(MR_DIGITS.indexOf(d)));
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_MR = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];

function monthIndex(word) {
  const w = word.toLowerCase();
  const en = MONTHS_EN.findIndex((m) => m.toLowerCase().startsWith(w.slice(0, 3)) && w.length >= 3);
  if (en >= 0) return en;
  return MONTHS_MR.findIndex((m) => m === word);
}

function iso(y, m, d) {
  const date = new Date(Date.UTC(y, m, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) return "";
  if (y < 1940 || y > 2015) return ""; // a marriage biodata; anything else is a misread
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "12 March 1997", "12/03/1997", "1997-03-12", "१२ मार्च १९९७" → "1997-03-12". "" if unsure. */
export function parseDate(raw) {
  const s = toAsciiDigits(String(raw ?? "")).trim();
  if (!s) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return iso(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s); // Indian order: day first
  if (m) return iso(+m[3], +m[2] - 1, +m[1]);
  m = /^(\d{1,2})(?:st|nd|rd|th)?[\s,-]+([^\s\d,]+)[\s,-]+(\d{4})$/i.exec(s);
  if (m && monthIndex(m[2]) >= 0) return iso(+m[3], monthIndex(m[2]), +m[1]);
  m = /^([^\s\d,]+)[\s,-]+(\d{1,2})(?:st|nd|rd|th)?[\s,-]+(\d{4})$/i.exec(s);
  if (m && monthIndex(m[1]) >= 0) return iso(+m[3], monthIndex(m[1]), +m[2]);
  return "";
}

export function formatDate(isoDate, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? "");
  if (!m) return "";
  const [y, mo, d] = [m[1], Number(m[2]) - 1, String(Number(m[3]))];
  return lang === "mr" ? `${toMarathiDigits(d)} ${MONTHS_MR[mo]} ${toMarathiDigits(y)}` : `${d} ${MONTHS_EN[mo]} ${y}`;
}

// Marathi time-of-day words decide AM/PM the way people actually say birth times.
const PART_OF_DAY = [
  { words: ["pahate", "पहाटे"], pm: false },
  { words: ["sakali", "sakaali", "सकाळी", "morning", "am", "a.m."], pm: false },
  { words: ["dupari", "dupaari", "दुपारी", "afternoon"], pm: true },
  { words: ["sandhyakali", "sandhyakaali", "संध्याकाळी", "evening"], pm: true },
  { words: ["ratri", "raatri", "रात्री", "night"], pm: true, night: true },
  { words: ["pm", "p.m."], pm: true },
];

/** "sakali 6:40", "6.40 pm", "18:40", "सकाळी ६.४०" → "06:40" / "18:40". "" if unsure. */
export function parseTime(raw) {
  const s = toAsciiDigits(String(raw ?? "")).toLowerCase().trim();
  const m = /(\d{1,2})\s*[:.]\s*(\d{2})/.exec(s) ?? /(\d{1,2})\s*(?:am|pm|a\.m\.|p\.m\.)/.exec(s);
  if (!m) return "";
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return "";
  const part = PART_OF_DAY.find((p) => p.words.some((w) => s.includes(w)));
  if (part && h <= 12) {
    if (part.pm && h < 12) h += 12;
    if (!part.pm && h === 12) h = 0;
    // "ratri 2:00" means 2 a.m.
    if (part.night && Number(m[1]) <= 4) h = Number(m[1]);
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function formatTime(hhmm, lang) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return "";
  const h = Number(m[1]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const clock = `${h12}:${m[2]}`;
  if (lang === "en") return `${clock} ${h < 12 ? "AM" : "PM"}`;
  const word = h < 5 ? "पहाटे" : h < 12 ? "सकाळी" : h < 16 ? "दुपारी" : h < 20 ? "संध्याकाळी" : "रात्री";
  return `${word} ${toMarathiDigits(clock)} वा.`;
}

/** "5'9\"", "5 ft 9 in", "5.9", "175 cm", "5 फूट ९ इंच" → centimetres (number), or 0 if unsure. */
export function parseHeight(raw) {
  const s = toAsciiDigits(String(raw ?? "")).toLowerCase().trim();
  if (!s) return 0;
  let m = /(\d{3})(?:\.\d+)?\s*(?:cm|से\.?मी)/.exec(s);
  if (m) return inRange(Number(m[1]));
  m = /(\d)\s*(?:'|ft|feet|foot|फूट|फुट)\s*(\d{1,2})?/.exec(s);
  if (m) return inRange(Math.round(Number(m[1]) * 30.48 + Number(m[2] ?? 0) * 2.54));
  m = /^(\d)\.(\d{1,2})$/.exec(s); // "5.9" is how people write 5 ft 9 in
  if (m && Number(m[2]) < 12) return inRange(Math.round(Number(m[1]) * 30.48 + Number(m[2]) * 2.54));
  m = /^(\d{3})$/.exec(s);
  if (m) return inRange(Number(m[1]));
  return 0;
}

function inRange(cm) {
  return cm >= 120 && cm <= 220 ? cm : 0;
}

export function formatHeight(cm, lang) {
  if (!cm) return "";
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return lang === "mr" ? `${toMarathiDigits(ft)} फूट ${toMarathiDigits(inch)} इंच` : `${ft} ft ${inch} in (${cm} cm)`;
}
