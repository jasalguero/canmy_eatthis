# CanMy*EatThis

A React Native (Expo) app for iOS and Android that tells dog and cat owners, fast,
whether something is safe for their pet to eat — from a photo, a typed description, or both.

**Status:** planning complete, no code written yet.
**Target:** a free hobby app, published on the App Store and Google Play.

> ⚠️ **Read [`docs/10-hobby-scope.md`](docs/10-hobby-scope.md) first.** Docs 00–09 describe a fully
> funded build. Doc 10 describes what is actually being built — free, one person, no budget for
> veterinary or legal review — and **overrides the others wherever they conflict.**

---

## The one-paragraph version

The user picks **dog** or **cat**, takes one or more photos and/or types a description, and taps
**Check**. The app identifies the item, then returns one of four verdicts: **Safe**, **Not great**,
**Toxic**, or **Not sure**. Identification is done by a vision LLM behind a thin serverless proxy.
The *verdict* is not — it comes from a curated, vet-reviewed knowledge base that ships with the app.
The LLM perceives; the database adjudicates. That split is the core safety decision of this project
and is not optional.

## Read the docs in this order

| Doc | What it settles |
|---|---|
| [`docs/00-product-spec.md`](docs/00-product-spec.md) | Screens, flows, verdict taxonomy, copy rules |
| [`docs/01-architecture.md`](docs/01-architecture.md) | **Answers the three technical questions.** System shape, data flow, why a server is required |
| [`docs/02-tech-decisions.md`](docs/02-tech-decisions.md) | Stack choices with alternatives and rationale (ADR style) |
| [`docs/03-api-contract.md`](docs/03-api-contract.md) | Proxy endpoints, schemas, error taxonomy — the contract between app and service |
| [`docs/04-knowledge-base.md`](docs/04-knowledge-base.md) | KB schema, sourcing, licensing, seeding, review, OTA updates |
| [`docs/05-safety-legal.md`](docs/05-safety-legal.md) | Disclaimers, store compliance, liability, emergency hotlines |
| [`docs/06-ui-design-system.md`](docs/06-ui-design-system.md) | Tokens, components, per-screen specs |
| [`docs/07-implementation-plan.md`](docs/07-implementation-plan.md) | **The phased build plan with acceptance criteria.** Start here to write code |
| [`docs/08-risks-and-limitations.md`](docs/08-risks-and-limitations.md) | What this app cannot do, honestly |
| [`docs/09-localisation.md`](docs/09-localisation.md) | English + Spanish at launch, architected for N languages |
| [`docs/10-hobby-scope.md`](docs/10-hobby-scope.md) | **Operative scope, real costs, spend caps, the no-vet editorial standard. Overrides the rest** |
| [`AGENTS.md`](AGENTS.md) | Conventions every implementing agent must follow |

## Three questions, answered up front

**Can everything run in the app, or is a server required?**
A server is required — a thin one. Not for compute, but because an API key in a shipped binary is an
extractable API key, because the identification prompt and safety rules must be fixable in hours
rather than in an app-store review cycle, and because caching cuts cost by roughly an order of
magnitude. The *knowledge base*, however, ships on-device, so typed queries for common items answer
instantly, offline, and for free. See [`docs/01-architecture.md`](docs/01-architecture.md).

**Are LLMs the right tool for the image recognition?**
For *identification*, yes — the label space here is unbounded (foods, plants, medications, cleaning
products, packaging) and a vision LLM reads ingredient labels, which no fixed-label classifier can.
For the *verdict*, no — that comes from the curated KB. Barcode scanning should sit in front of the
vision call for packaged goods (free, instant, exact), and a specialist plant-ID API should sit
beside it for plants, where misidentification is most lethal. See
[`docs/02-tech-decisions.md`](docs/02-tech-decisions.md).

**What about multiple languages?**
English and Spanish at launch, architected for more. The knowledge base is split into three
translation tiers rather than translated wholesale: **aliases and the short safety strings must be
translated** (an English-only KB means `cebolla` matches nothing and the instant offline lookup
fails for Spanish speakers), the one-sentence answer should be, and the long explanatory prose can
stay English behind a "shown in English" marker. Modelling `signs` and `emergency_actions` as a
~120-term controlled vocabulary translated once, rather than per-entry prose, is what makes the
mandatory tier cheap. Roughly a third the cost of translating everything, for nearly all the
user-visible benefit. See [`docs/09-localisation.md`](docs/09-localisation.md).

**What is the hardest problem?**
Not the UI and not the model. It is that a confident wrong identification kills a cat. The mitigation
is architectural: the app always shows what it thinks it saw and asks the user to confirm *before*
rendering a verdict, and "not sure" is a first-class verdict that renders amber, never green.

**What does it cost to run?**
About **$99/year** (Apple) **+ $25 once** (Google) **+ a couple of euros a month**. Cloudflare,
EAS and Sentry all sit inside their free tiers at hobby volume; the model bill at ~100 checks a day
is roughly a euro a month. The engineering risk is not cost per call but an unbounded bill, so a
**global daily spend cap and a kill switch are built in the same commit as the first model call**.
See [`docs/10-hobby-scope.md`](docs/10-hobby-scope.md).
