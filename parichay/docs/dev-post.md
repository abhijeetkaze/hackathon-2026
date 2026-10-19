---
title: "A biodata is the most private page a family prints. Parichay makes it on the phone, with Gemma"
published: false
tags: devchallenge, hf26challenge, gemma, opensource
cover_image: <!-- TODO: screenshot of a printed Traditional biodata (upload to DEV first) -->
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

<!-- TODO (2–4 sentences, your own): the moment that started this. A cousin's or friend's biodata,
     the DTP shop near the station, how long it took, what it cost, the photo on a shared PC.
     Real detail beats anything I can write here. -->

In Maharashtra, a marriage biodata (परिचय पत्र) is still a printed page. A family collects the details:
name, birth date and the exact birth time, education, job, salary, father and mother, brothers and
sisters, which village the mama lives in, gotra, kuldaivat, and a photo. Then someone takes it all to
the DTP shop. The operator retypes it into a template, charges ₹100–300, and the family's details and
the photo stay on a shared shop PC, or travel back and forth on WhatsApp.

So I built **Parichay** (परिचय, "introduction"), and said "pa-ri-chay".

**TL;DR.** You type the details the way you'd say them, in Marathi, Hindi, English or a mix.
**Gemma, running on the phone**, fills in a form. Code, not the model, turns "sakali 6:40" into
*सकाळी ६:४० वा.*, and every number on the page. You check it, pick a Marathi, English or bilingual
layout, add a photo and print an A4 PDF. Nothing is uploaded: no account, no server, and after the
first visit it works in airplane mode. A biodata costs ₹0 to make, which is what makes it a business
for the shop that sells it.

<!-- TODO: hero screenshot — free text on the left, the printed Traditional biodata on the right -->

## What I Built

- **Say it once.** One text box. *"Mulga. Naav Rohan Suresh Patil. Janma 12 March 1997, sakali 6:40,
  Pune. Uchi 5'9". BE Mechanical, COEP 2019…"* Marathi, Hinglish and English all work, and "Try an
  example" fills in a sample so you can see it straight away.
- **Gemma fills the form.** About 25 fields: personal details, education and work, family, horoscope
  details, contact and expectations. It also proposes the Marathi spelling of every name.
- **You check it.** Every field is editable. Marathi name spellings, and any date, time or height the
  code couldn't read for certain, are marked **check**. Nothing is guessed.
- **Blank means left out.** Any field you leave empty doesn't appear on the biodata. Families differ
  a lot in what they put on one, and the form shouldn't decide that for them.
- **Three layouts.** Traditional Marathi (॥ श्री गणेशाय नमः ॥, a maroon double border, Devanagari
  digits), Modern English, and Bilingual with both scripts on every line. Add a photo and it sits in
  the corner.
- **Print it.** Print → Save as PDF gives an A4 page the shop can print or the family can send.

**Why not just paste it into ChatGPT?** You can, for one biodata. But the details go to a server you
don't control, a chat model will happily "correct" a birth time or convert a date wrongly in a
confident voice, and you still have to lay out a Marathi page yourself. Parichay keeps the details on
the phone, never lets the model write a number, and ends with a print-ready page.

## How It Makes Money

Two people earn from Parichay: the person making biodatas, and me.

**Their side hustle.** Families already pay someone to make a biodata. Today that's the DTP shop near
the station, and the job is 15–20 minutes of retyping. With Parichay it's a two-minute check and a print.
So it works for:

- **DTP and print shops**, which already sell biodatas. At ₹150 a biodata, even five a week is about
  ₹3,000 a month, and the time saved goes to other print jobs.
- **The person everyone in the building asks for help with their phone.** With Parichay on their phone,
  they can make biodatas for neighbours and relatives for ₹100 each. They don't need a shop, a PC or
  design software. A biodata costs them ₹0 to make, so the whole ₹100 is income.
- **Vadhu-var suchak mandals (marriage bureaus)**, which make a biodata for every member and want them
  all to look the same.

**How I earn.** Parichay stays free and open source for any family that wants to make their own. What I
sell is the version a business wants:

| Plan | Price | What they get |
| --- | --- | --- |
| Free | ₹0 | The app, all three layouts, on any phone |
| **Shop** | **₹499 once** | Their shop's name and number in a small footer on every biodata they print (free advertising every time a family forwards it on WhatsApp), more wedding-card layouts, and setup on their phone with Gemma already downloaded, plus WhatsApp support |
| **Bureau** | **₹1,999 a year** | The bureau's own branding and layout, and help adding new members' biodatas |

**My costs are close to zero.** Gemma runs on the customer's phone, so there's no API bill and no
per-biodata cost. The site is a free Render static site. So every sale is profit, and the first sale
covers the whole business.

**Why sell something that's open source?** A shop isn't paying for the code. It's paying for its name
on the page, for layouts, and for someone to set it up and answer the phone. Anyone can build it
themselves from the repo, and that's fine.

<!-- TODO: be honest about status. The Shop and Bureau plans are what you'll offer; say so plainly, e.g.
     "The Shop plan isn't built yet. The footer is a small change, and I'll build it for the first shop that
     says yes." Then put the real answer from your first user here: would they pay ₹499? What did they say
     about the price? If a shop quotes you a different price for biodatas than ₹100–300, use theirs. -->

## Demo

**Try it:** [parichay-uq3d.onrender.com](https://parichay-uq3d.onrender.com). Open it in Chrome on an Android phone or
a desktop with a recent GPU, tap **Try an example**, then **Fill the form with Gemma**. The first run
downloads Gemma once (about 1.5 GB, use Wi-Fi). After that, turn on airplane mode and it still works.
No WebGPU? The form still works by hand.

<!-- TODO: 60–90 s screen recording on the phone, in airplane mode:
     1. open from the home screen  2. Try an example → Fill with Gemma
     3. a "check" chip on the Marathi name; fix it  4. switch Traditional → Bilingual, add a photo
     5. Print → Save as PDF, open the PDF -->

<!-- TODO: screenshot row — the free text, the filled form with a "check" chip, the printed PDF -->

## Code

{% github abhijeetkaze/hackathon-2026 %}

The project lives in [`parichay/`](https://github.com/abhijeetkaze/hackathon-2026/tree/main/parichay).
One static page, no backend, no dependencies and no build step: the browser loads plain ES modules,
and the domain logic has 21 `node:test` tests.

## How I Built It

### Gemma reads, code decides

A biodata gets matched on its birth time and date, so a wrong one is worse than a blank one. So I
split the work the same way every time:

- **Gemma** finds each value in the text and **copies it as written** into a JSON object. Its only
  creative job is proposing a Devanagari spelling for names, and those always come back marked *check*.
- **Code** turns what Gemma copied into dates, times and heights, and formats them for the page.
  If the code can't read something, the field stays empty and is flagged. It never guesses.
- **Labels** (जन्म तारीख, शिक्षण, वडिलांचे नाव, मामा, कुलदैवत…) are fixed strings in one file. The model
  never sees them, so it can't mistranslate a heading.

The parsers are where the Maharashtra-specific knowledge lives:

| What people write | What the code makes of it | Printed (Marathi) |
| --- | --- | --- |
| `sakali 6:40`, `सकाळी ६.४०` | 06:40 | सकाळी ६:४० वा. |
| `sandhyakali 6.40` | 18:40 | संध्याकाळी ६:४० वा. |
| `ratri 2:30` | 02:30, because "night" at 2:30 is after midnight | पहाटे २:३० वा. |
| `12/03/1997` | 12 March, day first the Indian way | १२ मार्च १९९७ |
| `5.9` | 5 ft 9 in, because that's how people write it, not 5.9 feet | ५ फूट ९ इंच |
| `31/02/1997`, `holi 97` | nothing: left empty and flagged *check* | — |

Phone numbers keep their English digits even on the Marathi layout, because people need to dial them.

<!-- TODO: real numbers from your phone, e.g. "On the example text, Gemma 2 2B filled N of M fields
     correctly in X s on a <phone model>; the misses were …". Even one honest run is worth adding. -->

### Why Gemma 2 2B and not the smaller Gemma 3 1B

In my previous project, Gemma 3 1B under WebLLM started repeating itself on long prompts. WebLLM gives
the whole model a single attention window, and Gemma 3 mixes short local windows with global ones, so
a long prompt either overflows the local layers or gets forgotten. A biodata prompt is a field list
plus a family's paragraph, so I used Gemma 2 2B, whose window matches its context. It's a bigger
download, but it reads the whole prompt. The pick is a small pure function: f16 weights when the GPU
supports them (half the memory), f32 otherwise.

The prompt goes in the user turn, because Gemma's chat template has no system role. The reply is
parsed defensively: code fences, chatter before the JSON and trailing commas are all tolerated,
and unknown keys are dropped.

### The browser is the only thing that prints Marathi right

My first instinct was a JavaScript PDF library. They don't shape Devanagari: conjuncts like क्ष, ज्ञ
and र्य come apart into loose letters. Browsers already shape Devanagari correctly, so the biodata is
an HTML page set in Noto Serif Devanagari, laid out in A4 millimetres, and printed with
`@page { size: A4; margin: 0 }`. "Save as PDF" in the print dialog makes the file.

On screen the same sheet has to fit a phone. Every size on the sheet is written in one CSS variable,
`--u`, which equals one millimetre of A4. In the preview `--u` is `100cqw / 210` (a 210th of the
preview's width), so the page scales to any screen; in print it's exactly `1mm`.

### Nothing to leak

The state is a JavaScript object in memory. Nothing goes to `localStorage`. The photo becomes an
object URL that never leaves the page. A service worker caches the app, the fonts and the WebLLM
module; WebLLM keeps the Gemma weights in its own cache. A test checks that the service worker
precaches every file the app needs, because one missing file silently breaks offline mode.

### The bug I caught

Birth times are where Marathi and English collide. My first parser treated "pm" and "ratri" (night)
the same way, and it also knew that "ratri 2:30" means 2:30 in the morning. So **"2:30 pm" came out
as 2:30 a.m.**, because the night rule fired for "pm" too. On a biodata that's the wrong horoscope.
The fix was to split them: "pm" means afternoon, and only the Marathi night words get the
after-midnight rule. There's a test for both now.

### The rest

- **Gemma:** Gemma 2 2B, q4f16 (or q4f32), through WebLLM on WebGPU, loaded from a CDN at runtime.
- **Fonts:** Noto Serif Devanagari, Noto Sans Devanagari and Noto Serif from Google Fonts, cached for offline.
- **Hosting:** a Render static site from one `render.yaml`, which runs the tests as its build step.
- **Design:** maroon and saffron, the colours of a wedding card. Light and dark for the app; the
  sheet itself is always paper.

<!-- TODO: screenshot of the Render dashboard showing the parichay static site -->

## Why Does Open Innovation Matter?

**Because a biodata is private.** It's a young person's photo, exact birth time, salary and parents'
jobs. The honest answer to "where does this go?" should be "nowhere", and with a hosted API it can't
be. With open weights, Gemma runs on the phone and the details are never sent anywhere.

**Because the business only works at ₹0 a biodata.**

| | Time per biodata | Cost to make one | What's left of a ₹150 biodata |
| --- | --- | --- | --- |
| Retyping at the DTP shop today | 15–20 min | the operator's time | ₹150, for 20 minutes of work |
| Parichay with Gemma on the phone | <!-- TODO: measured --> | ₹0 | ₹150, for two minutes of work |

With a paid API, every biodata would cost the shop money paid to a company abroad, and I'd have to
charge a monthly subscription to cover the tokens. With open weights there's nothing to meter, so I can
sell the Shop plan once for ₹499 and step out of the way.

**Because it works where the shop is.** A small shop's internet is flaky. Once Gemma is downloaded,
Parichay doesn't need it.

**Because nobody can take it away, and anyone can change it.** Gemma's weights, WebLLM, the Noto fonts
and Parichay's code are all open. A bureau in Kolhapur can add its own layout; someone can add Gujarati
or Kannada labels. No permission needed.

**Where a closed model would do better:** Marathi spelling. A large hosted model would transliterate
names more reliably than a 2B model on a phone. That's why name spellings are always marked *check* and
the person confirms them, and I think that's a fair price for keeping a family's details off a server.
It also costs a 1.5 GB download and a phone with WebGPU, and the form still works by hand without one.

## My First User

<!-- TODO — the "bonus points" part. Show Parichay to one DTP / print shop or marriage bureau near you,
     then write 4–6 honest sentences:
       - who they are (no names needed): "the print shop next to <place>"
       - what they do today, and what they charge
       - what happened when they tried it: what they liked, what confused them
       - would they pay? how much? did they?
       - what they asked for next (e.g. more layouts, a horoscope box, Hindi labels)
     If you couldn't reach anyone in time, say so plainly and say who you'll show it to first.
     Don't invent this part — judges can tell, and an honest "not yet" reads better. -->

## My Agent Session & How I Built It With Claude Code

I built Parichay in one morning with Claude Code, inside the last few hours of the Week 2 window. I made
the calls; Claude Code wrote the code and tests, and checked them as it went.

The turning points:

- **Picking the idea.** I asked for ideas that weren't already in the ~200 Week 2 entries (receipt
  sorters, invoice chasers and listing writers were everywhere) and that were rooted in Pune and
  Maharashtra. Out of a shortlist I picked the biodata maker.
- **Checking the clock first.** Before any code, it checked the deadline: Week 2 closes at 11:59 PM PDT
  on Oct 18, which was 12:29 PM IST the morning I built it.
- **Voice or not.** Voice input would have meant a cloud speech-to-text service, and that breaks the one
  promise the app makes. Typed input only, so "nothing leaves the phone" stays true.
- **"Gemma reads, code decides"** came out of the first plan: the model copies values and code owns every
  number, label and layout.
- **Carrying over lessons** from my Week 1 project: Gemma 2 2B instead of Gemma 3 1B, and no bundler.
- **The ratri / pm bug** above, caught while writing the time parser.
- **What it couldn't test.** The build sandbox had no browser or GPU, so the first real Gemma run was on my
  own phone. <!-- TODO: what happened on that first run, and anything you fixed -->

By the end: <!-- TODO: commit count --> commits, 21 tests, one static page.

## Prize Categories

- **Best Use of Gemma**: Gemma 2 2B runs entirely on the phone through WebLLM and turns free-form
  Marathi, Hindi and English into a structured biodata. It copies values and proposes Devanagari names;
  code handles every number and label, so the model can't put a wrong birth time on the page.
- **Best Use of Render**: the whole app is a Render static site deployed from one `render.yaml`, with the
  test suite as the build step, so a failing test never deploys. Live at
  [parichay-uq3d.onrender.com](https://parichay-uq3d.onrender.com).

---

*Built solo in Pune, October 2026. I drafted this post with Claude Code and edited it myself.*
