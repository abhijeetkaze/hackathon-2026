// The biodata: which fields exist, their fixed labels in both languages, and how they group
// into sections. Labels live here and nowhere else; the model only ever fills in values.

/** kind: text | name (has a Devanagari twin, key + "Mr") | date | time | height | long */
export const FIELDS = [
  { key: "fullName", kind: "name", section: "personal", en: "Name", mr: "नाव" },
  { key: "birthDate", kind: "date", section: "personal", en: "Date of birth", mr: "जन्म तारीख" },
  { key: "birthTime", kind: "time", section: "personal", en: "Time of birth", mr: "जन्म वेळ" },
  { key: "birthPlace", kind: "text", section: "personal", en: "Place of birth", mr: "जन्म स्थळ" },
  { key: "height", kind: "height", section: "personal", en: "Height", mr: "उंची" },
  { key: "education", kind: "text", section: "work", en: "Education", mr: "शिक्षण" },
  { key: "occupation", kind: "text", section: "work", en: "Occupation", mr: "नोकरी / व्यवसाय" },
  { key: "income", kind: "text", section: "work", en: "Annual income", mr: "वार्षिक उत्पन्न" },
  { key: "fatherName", kind: "name", section: "family", en: "Father", mr: "वडिलांचे नाव" },
  { key: "fatherOccupation", kind: "text", section: "family", en: "Father's occupation", mr: "वडिलांचा व्यवसाय" },
  { key: "motherName", kind: "name", section: "family", en: "Mother", mr: "आईचे नाव" },
  { key: "motherOccupation", kind: "text", section: "family", en: "Mother's occupation", mr: "आईचा व्यवसाय" },
  { key: "siblings", kind: "text", section: "family", en: "Brothers / sisters", mr: "भाऊ / बहीण" },
  { key: "mama", kind: "text", section: "family", en: "Maternal uncle (mama)", mr: "मामा" },
  { key: "nativePlace", kind: "text", section: "family", en: "Native place", mr: "मूळ गाव" },
  { key: "gotra", kind: "text", section: "horoscope", en: "Gotra", mr: "गोत्र" },
  { key: "kuldaivat", kind: "text", section: "horoscope", en: "Kuldaivat", mr: "कुलदैवत" },
  { key: "rashi", kind: "text", section: "horoscope", en: "Rashi", mr: "रास" },
  { key: "nakshatra", kind: "text", section: "horoscope", en: "Nakshatra", mr: "नक्षत्र" },
  { key: "address", kind: "long", section: "contact", en: "Address", mr: "पत्ता" },
  { key: "contact", kind: "text", section: "contact", en: "Contact", mr: "संपर्क" },
  { key: "expectations", kind: "long", section: "expectations", en: "Expectations", mr: "अपेक्षा" },
];

export const SECTIONS = [
  { id: "personal", en: "Personal details", mr: "वैयक्तिक माहिती" },
  { id: "work", en: "Education and work", mr: "शिक्षण व नोकरी" },
  { id: "family", en: "Family", mr: "कौटुंबिक माहिती" },
  { id: "horoscope", en: "Horoscope", mr: "पत्रिका माहिती" },
  { id: "contact", en: "Contact", mr: "संपर्क" },
  { id: "expectations", en: "Expectations", mr: "अपेक्षा" },
];

export const TITLE = { en: "Biodata", mr: "परिचय पत्र" };

/** Every value is a string; dates are ISO, times HH:MM, height is centimetres as a string. */
export function emptyBiodata() {
  const b = { gender: "" };
  for (const f of FIELDS) {
    b[f.key] = "";
    if (f.kind === "name") b[f.key + "Mr"] = "";
  }
  return b;
}
