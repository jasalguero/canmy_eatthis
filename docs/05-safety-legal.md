# 05 — Safety, Legal and Store Compliance

This app tells people whether a thing will hurt their animal. Treat that seriously in the
engineering, not only in the footer text.

> Nothing here is legal advice.

## 0. The framing

The app does not claim to know whether something is toxic. It claims to know **what veterinary
authorities say**, and it shows them. That claim it can support.

Concretely: the source is a primary element on every result screen, above the fold, not a collapsed
footnote — *"The Merck Veterinary Manual lists dark chocolate as toxic to dogs →"*. Every entry
carries at least two independent authoritative sources. Entries where sources are thin or disagree
are omitted rather than guessed, and omission renders as `unknown`, which routes the user to a vet.

This is a product decision, not a disclaimer, and it makes the app more useful rather than less: a
worried owner at 2 a.m. wants the fastest possible route to something trustworthy, and the honest
answer is almost always "call someone". See `docs/04-knowledge-base.md` §2.

## 1. Non-negotiable product rules

1. **"Unknown" never renders as safe.** Amber, never green. Copy: *"Don't assume it's safe."*
2. **The word "safe" is never a bare claim.** Use "no known toxicity", "generally well tolerated".
3. **The emergency path is never behind a login, a limit or a network call.** A toxic verdict and
   the hotline CTA work offline and with the daily photo-identification cap used up.
4. **Every screen that gives a verdict carries the disclaimer.** Not buried in Settings.
5. **The confirm step cannot be skipped for photo-derived identifications.** It is the main defence
   against a confident misidentification.
6. **Never tell a user their pet does not need a vet.** The app can say something is not known to be
   toxic. It cannot clear an animal.
7. **No dosage calculator and no risk bands.** Apple's 1.4.1 constrains dosage calculators, and
   risk banding is too expertise-dependent to ship without veterinary review
   (`docs/00-product-spec.md` §6).
8. **No diagnosis and no symptom checker.** Out of scope, and a different regulatory category.

## 2. Disclaimer copy

**Short form** (foot of every result screen, ~1 line, muted, always visible):

> General information only — not veterinary advice. If you're worried, call your vet.

**Long form** (first run, Settings, and the store listing description):

> CanMy*EatThis gives general information about foods, plants and substances and how they are
> commonly reported to affect dogs and cats. It is not a medical device, and it does not diagnose,
> treat, cure or prevent any condition. It cannot examine your pet, know how much was eaten, or
> account for your pet's age, weight, breed or health. Identification from photos can be wrong.
> Always confirm with a veterinarian before acting, and in an emergency call your vet or a pet
> poison hotline straight away.

The "not a medical device, and does not diagnose, treat, cure or prevent any condition" phrasing is
lifted deliberately — it is the wording Google Play's health content policy asks for.

## 3. Emergency hotlines

Bundled offline, chosen by **region** with a manual override in Settings, and rendered as one-tap
`tel:` links (`packages/shared/src/hotlines.ts`, D30). Numbers carry a `verifiedAt` date and are
re-verified by a person before every release — a wrong number on this screen is the worst bug this
app can ship. Release builds show only verified numbers.

The emergency screen offers, in order: the user's **own vet** first, which is free and usually
faster; the region's veterinary or general poison information services, with the fee stated where
one applies and the languages each answers in; and "Find an emergency vet near me" as a maps link.
Do not build a vet directory.

The **ASPCA Animal Poison Control Center** (+1 888 426 4435, fee may apply) and the **Pet Poison
Helpline** (+1 855 764 7661, fee applies) are offered in the US only: they are US toll-free numbers,
which generally cannot be dialled from abroad. A region with no confirmed line that takes calls about
animals gets no guessed number; it gets the user's vet and the maps link.

## 4. Apple App Store

| Guideline | What it means here | Action |
|---|---|---|
| **1.4.1 — physical harm** | Health apps must remind users to consult a professional; unsupported accuracy claims are rejected; drug dosage calculators need institutional provenance | Disclaimer on every result; no dosage calculator; make no accuracy claim in the listing |
| **2.3.1 — accurate metadata** | New and AI functionality must be described specifically in review notes; no hidden or dormant features | Review notes state plainly what the release does. For the photo release: photos are sent to a third-party vision model for identification; verdicts come from a curated database. Features are switched at build time, never remotely (D28) |
| **5.1.1 — data collection** | Permissions must be justified in the purpose strings | Camera and photo-library purpose strings must say *why*, in plain language |
| **5.1.2 — data use and sharing** | **Explicit consent required before sharing personal data with a third-party AI service** | First-run consent screen naming the provider. Photos are personal data |
| **5.1.3 — health data** | No advertising or data-mining use of health data | Do not sell data; do not feed queries to ad networks |

Also required: a **Privacy Manifest** (`PrivacyInfo.xcprivacy`) declaring data types and any
required-reason APIs, and accurate **App Privacy** nutrition labels.

Expect a rejection or a review question on the first submission. Pre-empt it: record a short screen
capture of the flow, and state in the notes that the app is an information tool for pet owners,
not a medical device, and that it directs users to veterinary professionals.

## 5. Google Play

- **Health apps declaration form** on the App content page is mandatory for anything health-adjacent.
  The policy text is written for human health and does not mention veterinary apps, but reviewers
  apply it broadly. Declare, and include the "not a medical device" disclaimer.
- **Data safety form** must match actual behaviour, including the barcode lookup and, for the photo
  release, the photo upload to a third party.
- **Generative AI policy**: disclose AI use, provide a way to report offensive or wrong output.
  Add a "Report a wrong answer" affordance on every result screen — this is a policy requirement,
  a KB-improvement channel and a liability mitigation in one.
- No health misinformation contradicting medical consensus — the curated, cited KB is the defence
  here, and another reason the model must not emit verdicts directly.

## 6. Privacy, terms and liability

The mitigations that matter most here cost nothing.

- **Collect nothing.** No accounts, no email, no location, no analytics. GDPR compliance for "we
  store nothing" is close to trivial, and there is no breach to have. Keep it that way.
- **Write the privacy policy yourself, from what the app actually does.** A boilerplate policy
  describing data the app does not collect is worse than a short accurate one. It is published from
  `site/` (D31) and must say: typed lookups stay on the phone; a barcode scan sends the barcode and
  the device's IP address to Open Food Facts; the emergency-vet search opens Google Maps; a report is
  an email the user chooses to send. For the photo release, add: photos are sent to Google's Gemini
  API for identification and not stored by us, on the paid tier, which does not train on them
  (`docs/01-architecture.md` §6.2).
- **EXIF including GPS is stripped on-device before any upload** — verified with `exiftool` in CI on
  the pipeline's output.
- **Disclose the AI step and get consent at first run** in any build with photo identification.
  Apple requires this explicitly (5.1.2), and it is right regardless. Offer a text-only mode that
  never uploads a photo; the app stays fully functional in it.
- **GDPR** applies (developer in Spain, EU users): name the controller and a contact address, state
  the lawful basis and retention, and point to the AEPD. With the photo release, a Data Processing
  Addendum with the model provider.
- **Terms of use** can be short: information not advice, no warranty, limitation of liability,
  governing law, contact address. Published alongside the privacy policy.
- **Both are written in-house, without a lawyer's review** (D31). Revisit that if the app ever
  charges money or its data handling grows.

## 7. Liability posture

- **Not charging money helps.** It removes some consumer-protection and commercial-liability angles.
  It does not remove a negligence claim, so it is a reason to be careful, not a reason to relax.
- **Publishing as an individual** is fine in Spain for a free app with no revenue; there is no need
  to register as autónomo to give something away. That changes the moment the app makes money.
- **A contact email is mandatory** under both stores' policies: canmy_eatthis@jasalguero.com, read
  by a person, and also where "this answer is wrong" reports arrive.
- **The "Report a wrong answer" flow ships in the first release.** It is a Google Play requirement
  for AI content, the KB's correction channel, and evidence of diligence if anything goes wrong.
- **Keep the review records** — the `review` block in each KB entry records who checked it against
  the editorial standard, and when. It is the audit trail if a verdict is ever challenged.
- When the Worker is live, keep its request log (with prompt version and KB version) for 30 days so
  any specific complaint can be reconstructed.
