# Parichay · परिचय

*A marriage biodata maker that keeps the family's details on the phone.*

Type the details the way you'd say them, in Marathi, Hindi, English or a mix. **Gemma runs on the
phone** and fills in a form. You check it, pick a layout, add a photo and print a Marathi, English
or bilingual biodata as an A4 PDF. No account, no server, nothing uploaded.

**Live:** [parichay-uq3d.onrender.com](https://parichay-uq3d.onrender.com)

Built for the [DEV Hacktoberfest 2026 Open-Source AI Challenge, Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).
Project started **2026-10-18** (US Pacific time, the contest's timezone).

## Who it's for

DTP and print shops in Maharashtra charge ₹100–300 to make a biodata, and spend 15–20 minutes
retyping a family's details into a template. Vadhu-var suchak mandals (marriage bureaus) do the same
for every member. Parichay turns that into about two minutes, and the details never sit on a shared
shop PC or a server.

## How it works

| Step | What happens | Where |
| --- | --- | --- |
| 1. Describe | Free-form text, any mix of Marathi / Hindi / English | the phone |
| 2. Extract | **Gemma 2 2B** (WebLLM, WebGPU) copies each value into a JSON object and proposes Devanagari spellings for names | the phone |
| 3. Convert | Dates, birth times and heights are parsed and formatted **in code**, never by the model | the phone |
| 4. Check | Editable form; names and anything the code couldn't read are marked *check* | the phone |
| 5. Print | `window.print()` with A4 `@page` CSS → Save as PDF | the phone |

Design rules:

- **Labels are fixed strings** (`web/js/domain/biodata.js`). The model only fills values.
- **The model never writes a number that gets printed.** "sakali 6:40" becomes 06:40 in
  `parseTime`, then "सकाळी ६:४० वा." in `formatTime`. If the code can't read a date, the field
  stays empty and is flagged instead of guessed.
- **Blank fields are left off the biodata**, so each family includes only what they want.
- **The browser makes the PDF.** JS PDF libraries don't shape Devanagari conjuncts (क्ष, ज्ञ, र्य),
  so the sheet is HTML with Noto Serif Devanagari and the browser's print engine does the shaping.
- **Without WebGPU the app still works**: fill the form by hand.
- **The photo is an object URL** in memory. Family details are never written to storage. The only
  thing saved on the phone is a shop's licence key and its phone number.

## Plans

| Plan | Price | What it adds |
| --- | --- | --- |
| Free | ₹0 | Everything above, for anyone making their own family's biodata |
| Shop | ₹499 once | The shop's name and number in the footer of every biodata, the Royal layout, setup and WhatsApp support |
| Bureau | ₹1,999 a year | All of the Shop plan, plus the bureau's name and a member number at the top of each biodata |

To buy a plan: <!-- TODO: your WhatsApp / UPI / email here -->

**How the keys work, offline.** A licence key is `PRCH1.<payload>.<signature>`. The payload names the
plan and the business (and, for a bureau, the end date), and it's signed with Ed25519. The app holds
only the public key (`web/js/domain/licence.js`), so it checks a key with no network, and the business
name on the biodata comes from the key, so one shop's key can't print another shop's name. In the app,
**Try a demo Shop key** and **Try a demo Bureau key** use real keys for two made-up businesses.

The code is open, so anyone can remove the check and run their own copy. That's fine: a shop pays for
its name on the page, setup and support.

Making a key (on your own machine; the private key never goes in this repo):

```bash
node scripts/make-key.mjs --init          # once: creates ~/.parichay/signing-key.pem, prints the public key
node scripts/make-key.mjs --plan shop --name "Sai Prints, Kothrud"
node scripts/make-key.mjs --plan bureau --name "Shubh Mangal Vadhu-Var Kendra"   # valid one year
```

## Layout

```
web/
  index.html, styles.css, sw.js, manifest.webmanifest, icon.svg
  js/domain/   biodata.js (fields, labels)  format.js (dates, times, heights, digits)
               extract.js (prompt, JSON parsing, model pick)  render.js (layouts)
               licence.js (Shop / Bureau keys, checked offline)
scripts/       make-key.mjs (signs licence keys)
  js/adapters/ gemma.js (WebLLM from CDN)
  js/main.js   form, preview, printing
test/          node:test, no dependencies
```

No dependencies and no build step: the browser loads the ES modules directly.

## Run

```bash
npm test          # domain tests
npm run serve     # http://localhost:8080  (WebGPU needs localhost or https)
```

Open it in Chrome on Android or desktop. The first "Fill with Gemma" downloads about 1.5 GB once
(use Wi-Fi). After that it works in airplane mode.

## Deploy

`render.yaml` at the repo root deploys `parichay/web` as a Render static site.

## License

Apache-2.0 (see the repository root).
