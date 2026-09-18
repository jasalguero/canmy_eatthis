# 05 — Safety, Legal and Store Compliance

This app tells people whether a thing will hurt their animal. Treat that seriously in the
engineering, not only in the footer text.

> Nothing here is legal advice.
>
> **Hobby build:** a paid legal review is out of scope. `docs/10-hobby-scope.md` §5 sets out what to
> do instead — collect nothing, write the privacy policy yourself and honestly, use a template for
> the ToS, publish as an individual, and be clear-eyed that the residual risk is reduced rather than
> removed. If this ever becomes a funded product, a lawyer's review becomes a launch blocker again.

## 0. The framing, for a build with no veterinary review

The app does not claim to know whether something is toxic. It claims to know **what veterinary
authorities say**, and it shows them. That claim it can support.

Concretely: the source is a primary element on every result screen, above the fold, not a collapsed
footnote — *"The Merck Veterinary Manual lists dark chocolate as toxic to dogs →"*. Every entry
carries at least two independent authoritative sources. Entries where sources are thin or disagree
are omitted rather than guessed, and omission renders as `unknown`, which routes the user to a vet.

This is a product decision, not a disclaimer, and it makes the app more useful rather than less: a
worried owner at 2 a.m. wants the fastest possible route to something trustworthy, and the honest
answer is almost always "call someone". See `docs/10-hobby-scope.md` §4.

## 1. Non-negotiable product rules

1. **"Unknown" never renders as safe.** Amber, never green. Copy: *"Don't assume it's safe."*
2. **The word "safe" is never a bare claim.** Use "no known toxicity", "generally well tolerated".
3. **The emergency path is never behind a paywall, a login, a quota or a network call.** A toxic
   verdict and the hotline CTA work offline, on an expired subscription, with the free tier used up.
4. **Every screen that gives a verdict carries the disclaimer.** Not buried in Settings.
5. **The confirm step cannot be skipped for photo-derived identifications.** It is the main defence
   against a confident misidentification.
6. **Never tell a user their pet does not need a vet.** The app can say something is not known to be
   toxic. It cannot clear an animal.
7. **No dosage calculator, and in the hobby build no risk bands either.** Apple's 1.4.1 constrains
   dosage calculators; `docs/10-hobby-scope.md` §4 cuts risk banding altogether as too
   expertise-dependent to ship unreviewed.
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

Must be bundled offline, region-aware by locale with a manual override in Settings, and rendered as
one-tap `tel:` links. Numbers carry a `verifiedAt` date and are re-verified by a human before every
release — a wrong number on this screen is the worst bug this app can ship.

Include at minimum: the user's region's veterinary or general poison information service, the
**ASPCA Animal Poison Control Center** (+1 888 426 4435, fee applies) and the **Pet Poison Helpline**
(+1 855 764 7661, fee applies) as international fallbacks, and a prompt to call **their own vet**
first, which is free and usually faster. State the fee where one applies — an unexpected charge
during an emergency is a bad experience and a support burden.

Add "Find an emergency vet near me" as a maps deep link. Do not build a vet directory.

## 4. Apple App Store

| Guideline | What it means here | Action |
|---|---|---|
| **1.4.1 — physical harm** | Health apps must remind users to consult a professional; unsupported accuracy claims are rejected; drug dosage calculators need institutional provenance | Disclaimer on every result; no dosage calculator; make no accuracy claim in the listing |
| **2.3.1 — accurate metadata** | New and AI functionality must be described specifically in review notes | Write review notes that state plainly: photos are sent to a third-party vision model for identification; verdicts come from a curated database |
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
- **Data safety form** must match actual behaviour, including the photo upload to a third party.
- **Generative AI policy**: disclose AI use, provide a way to report offensive or wrong output.
  Add a "Report a wrong answer" affordance on every result screen — this is a policy requirement,
  a KB-improvement channel and a liability mitigation in one.
- No health misinformation contradicting medical consensus — the curated, cited, vet-reviewed KB is
  the defence here, and another reason the model must not emit verdicts directly.

## 6. Privacy

- **Data collected:** photos (transient, not stored server-side), typed queries (logged normalised
  and hashed for KB gap analysis), device attestation identity, crash and analytics events.
- **Not collected:** name, email, location, contacts, precise identifiers. **EXIF including GPS is
  stripped on-device before upload** — verify with `exiftool` in CI on the pipeline's output.
- Retention: request logs 30 days, then aggregate counts only. Images: never persisted.
- Name the AI provider explicitly in the privacy policy and state their retention terms. Check
  whether the chosen provider's API tier trains on inputs — use a no-training tier.
- **GDPR** applies (developer in Spain, EU users): lawful basis, a stated retention period, an
  erasure route, and a Data Processing Addendum with the model provider. Since there are no
  accounts, keep it that way — no accounts means far less personal data to handle.
- Offer a **text-only mode** that never uploads a photo, for users who decline AI processing. The
  app must remain functional in that mode.

## 7. Liability posture

- Terms of service with a limitation of liability and a clear "information, not advice" framing,
  accepted at first run.
- Consider incorporating (an SL in Spain) rather than shipping as a sole trader, and look into
  professional indemnity cover.
- Keep the veterinary review records — the sign-off in each KB entry is the audit trail if a
  verdict is ever challenged.
- Keep the request log (with prompt version and KB version) for 30 days so any specific complaint
  can be reconstructed.
- **Ship the "Report a wrong answer" flow in v1**, wired to a real inbox that a human reads.
