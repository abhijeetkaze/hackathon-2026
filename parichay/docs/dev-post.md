---
title: "Parichay: a marriage biodata that never leaves the phone"
published: false
tags: devchallenge, hf26challenge, gemma, opensource
cover_image: <!-- TODO: screenshot of a printed Traditional biodata (upload to DEV first) -->
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

## What I Built

**Try it:** <!-- TODO: Render URL --> · **Code:** [github.com/abhijeetkaze/hackathon-2026/tree/main/parichay](https://github.com/abhijeetkaze/hackathon-2026/tree/main/parichay)

In Maharashtra, a marriage biodata (परिचय पत्र) is still a printed page. A family gathers the details:
name, birth date and time, education, job, father and mother, siblings, the mama's village, gotra,
kuldaivat, a photo. Then someone takes it to the DTP shop near the station. The operator retypes
everything into a template, charges ₹100–300, and the family's details and the photo stay on a shared
shop PC, or go back and forth on WhatsApp.

**Parichay** does that job on a phone:

1. **Type it the way you'd say it.** *"Mulga. Naav Rohan Suresh Patil. Janma 12 March 1997, sakali 6:40, Pune. Uchi 5'9"…"* Marathi, Hindi, English or a mix.
2. **Gemma, running on the phone, fills in a form.** You check every field. Name spellings in Marathi and anything Parichay couldn't read for certain are marked *check*.
3. **Pick a layout and print.** Traditional Marathi, Modern English or Bilingual, with the photo, as an A4 PDF.

Nothing is uploaded. There is no server and no account, and after the first visit it works in airplane mode.

**Who pays:** the DTP shop owner. A 20-minute retyping job becomes a two-minute check, and the ₹150 is
all margin because each biodata costs ₹0 to produce. Marriage bureaus (vadhu-var suchak mandals) are
the second customer: they make biodatas for every member and want them consistent.

<!-- TODO: first user. Show it to a DTP / print shop near you. What did they say? Would they pay, and how much?
     What did they ask for next? 3–5 honest sentences. This is the "bonus points" part. -->

## Demo

<!-- TODO: 60–90 s screen recording on the phone:
     1. Airplane mode ON, open the app from the home screen.
     2. Paste/type the example, tap "Fill the form with Gemma".
     3. Show the filled form and a "check" chip on the Marathi name; correct it.
     4. Switch Traditional → Bilingual, add a photo.
     5. Print → Save as PDF, open the PDF. -->

<!-- TODO: screenshot row: the free text, the filled form, the printed Traditional biodata -->

## How I Built It

One static page, no backend and no build step. The browser loads plain ES modules, the domain is pure
JavaScript with 21 `node:test` tests, and a service worker makes it work offline.

### Gemma on the phone, with a narrow job

The extraction runs **Gemma 2 2B** through [WebLLM](https://github.com/mlc-ai/web-llm), which compiles
models to WebGPU. It downloads once (about 1.5 GB on Wi-Fi) and then runs on the phone's GPU.

I gave the model as small a job as I could: **find each value in the text and copy it into a JSON
object.** The one creative thing it does is propose a Devanagari spelling for each name, and those
fields always come back marked *check*, because "Patil" → "पाटील" is easy but plenty of names aren't.

I used Gemma 2 2B rather than the smaller Gemma 3 1B on purpose. In my last project, Gemma 3 1B
under WebLLM repeated itself on long prompts, because WebLLM gives the whole model one attention
window and Gemma 3 mixes short local windows with global ones. A biodata prompt is a schema plus the
family's text, so I wanted a model whose window matches its context.

<!-- TODO: real numbers from your phone: model, time to fill, how many fields right on the example -->

### The model never writes a number that gets printed

A wrong birth time on a biodata is worse than a blank one, because people match horoscopes on it. So
Gemma copies the user's words ("sakali 6:40"), and code does the rest:

- `parseTime` reads Marathi parts of the day (पहाटे, सकाळी, दुपारी, संध्याकाळी, रात्री) to settle AM
  or PM, and `formatTime` prints **सकाळी ६:४० वा.**
- `parseDate` reads "12 March 1997", "12/03/1997" (day first, the Indian way) and "१२ मार्च १९९७".
- `parseHeight` reads 5'9", "5.9" (which is how people write 5 ft 9 in), 175 cm and "५ फूट ९ इंच".

If the code can't read a value, the field stays empty and is flagged. It never guesses.

### Labels are fixed, blanks are left out

Every label (जन्म तारीख, शिक्षण, वडिलांचे नाव, मामा, कुलदैवत…) is a fixed string in one file, so the
model can't mistranslate a heading. Any field left blank is left off the page. Families differ a lot
in what they put on a biodata, and the form shouldn't decide that for them.

### The browser is the only thing that prints Marathi correctly

My first instinct was a JS PDF library. Those libraries don't shape Devanagari: conjuncts like क्ष,
ज्ञ and र्य come apart into separate letters. The browser's text engine shapes them correctly, so the
biodata is an HTML page set in Noto Serif Devanagari, sized in A4 millimetres with `@page { size: A4 }`,
and "Save as PDF" in the print dialog produces the file. On screen, the same sheet is sized in a CSS
unit tied to the preview's width, so the A4 page scales down to any phone.

### Works without the AI too

If the browser has no WebGPU, the form still works by hand. The AI saves time, but the app doesn't
depend on it.

## Why Does Open Innovation Matter?

Because a biodata is the most personal page a family prints: a young person's photo, their birth
time, their salary, their parents' jobs, which village the mama lives in. The honest answer to "where
does this data go?" should be "nowhere", and with a closed API it can't be.

With open weights it can. Gemma runs on the phone, so the details are never sent anywhere, and that
holds even in a shop with no internet. It also makes the business work: the shop pays nothing per
biodata, there's no API key to leak or bill to pay, and no provider can change the price or switch
the model off.

It also matters who can change it. Everything here is open: Gemma's weights, WebLLM, the fonts and
the code. A bureau in Kolhapur can add their own layout, someone can add Gujarati or Kannada labels,
and nobody needs anyone's permission to do it.

## Prize Categories

- **Best Use of Gemma**: Gemma 2 2B runs entirely on the phone through WebLLM and turns free-form
  Marathi, Hindi and English into a structured biodata, with code handling every number.
- **Best Use of Render**: the whole app is a Render static site, deployed from one `render.yaml`.
  <!-- TODO: remove if not deployed on Render -->

---

*Built solo in Pune, October 2026.*
