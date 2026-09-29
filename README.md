# CanMy*EatThis

A React Native (Expo) app for iOS and Android that tells dog and cat owners, fast, what published
veterinary sources say about something their pet ate — from a typed description, a barcode, and
later a photo.

**Status:** Phases 0–4 built; working towards the first store release (typed lookups and barcode
scanning). See [`docs/07-implementation-plan.md`](docs/07-implementation-plan.md).
**Target:** a free app, made by one person, published on the App Store and Google Play.

---

## The one-paragraph version

The user picks **dog** or **cat**, types a description, scans a barcode or (later) takes a photo, and
taps **Check**. The app identifies the item, then returns one of four verdicts: **No known
toxicity**, **Not great**, **Toxic**, or **Not sure**. Photo identification is done by a vision LLM
behind a thin serverless proxy. The *verdict* is not — it comes from a curated knowledge base that
ships with the app, where every entry cites at least two independent authoritative sources and the
source is shown on every result. The LLM perceives; the database adjudicates. That split is the core
safety decision of this project and is not optional.

## Read the docs in this order

| Doc | What it settles |
|---|---|
| [`docs/00-product-spec.md`](docs/00-product-spec.md) | Screens, flows, verdict taxonomy, copy rules, **what is out of scope** |
| [`docs/01-architecture.md`](docs/01-architecture.md) | **Answers the three technical questions.** System shape, data flow, running costs and the spend cap |
| [`docs/02-tech-decisions.md`](docs/02-tech-decisions.md) | Stack choices with alternatives and rationale (ADR style) |
| [`docs/03-api-contract.md`](docs/03-api-contract.md) | Proxy endpoints, schemas, error taxonomy — the contract between app and service |
| [`docs/04-knowledge-base.md`](docs/04-knowledge-base.md) | KB schema, **the editorial standard**, sourcing, licensing, seeding, OTA updates |
| [`docs/05-safety-legal.md`](docs/05-safety-legal.md) | Disclaimers, store compliance, liability, emergency hotlines |
| [`docs/06-ui-design-system.md`](docs/06-ui-design-system.md) | Tokens, components, per-screen specs |
| [`docs/07-implementation-plan.md`](docs/07-implementation-plan.md) | **The phased build plan with acceptance criteria.** Start here to write code |
| [`docs/08-risks-and-limitations.md`](docs/08-risks-and-limitations.md) | What this app cannot do, honestly |
| [`docs/09-localisation.md`](docs/09-localisation.md) | English + Spanish at launch, architected for N languages |
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
For the *verdict*, no — that comes from the curated KB. Barcode scanning sits in front of the
vision call for packaged goods (free, instant, exact). Plants, where misidentification is most
lethal, resolve by typed name, and a photo-identified plant is always treated as low confidence. See
[`docs/02-tech-decisions.md`](docs/02-tech-decisions.md).

**What about multiple languages?**
English and Spanish at launch, architected for more. The knowledge base is translated in two tiers:
**aliases and the short safety strings** (an English-only KB means `cebolla` matches nothing and the
instant offline lookup fails for Spanish speakers), and the one-sentence answer. There is no
long-form prose to translate. Modelling `signs` and `emergency_actions` as a controlled vocabulary
translated once, rather than per-entry prose, is what keeps the mandatory tier cheap. See
[`docs/09-localisation.md`](docs/09-localisation.md).

**What is the hardest problem?**
Not the UI and not the model. It is that a confident wrong identification kills a cat. The mitigation
is architectural: the app always shows what it thinks it saw and asks the user to confirm *before*
rendering a verdict, and "not sure" is a first-class verdict that renders amber, never green.

**What does it cost to run?**
About **$99/year** (Apple) **+ $25 once** (Google) **+ a couple of euros a month**. Cloudflare and
EAS sit inside their free tiers at this volume; the model bill at ~100 checks a day is roughly a
euro a month, and the first release makes no model calls at all. The engineering risk is not cost
per call but an unbounded bill, so a **global daily spend cap and a kill switch are built in the
same commit as the first model call**. See [`docs/01-architecture.md`](docs/01-architecture.md) §6.

## Licence

Free to use, change and share **for any non-commercial purpose**; commercial use needs permission.

- **Code:** [PolyForm Noncommercial License 1.0.0](LICENSE).
- **Content** — the knowledge base entries (`packages/kb/data/`), their vocabulary translations
  (`packages/kb/vocab/`) and the legal pages (`site/`):
  [Creative Commons Attribution-NonCommercial 4.0](LICENSE-CONTENT). Credit
  "CanMy*EatThis by Jose Salguero" and link back to this repository.

The sources each knowledge base entry cites keep their own terms. For commercial use, contact
canmy_eatthis@jasalguero.com.
