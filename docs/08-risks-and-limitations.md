# 08 — Risks and Limitations

Written plainly, because deciding to build this means accepting these.

## 1. The things this app fundamentally cannot do

- **It cannot know how much was eaten.** Toxicity is dose-dependent for almost everything on the
  list. One grape and a kilo of grapes are different events, and the app sees neither.
- **It cannot know the animal.** Breed, age, weight, kidney function, existing medication. A 3 kg
  Chihuahua and a 40 kg Labrador are different animals facing the same square of chocolate.
- **It cannot distinguish some things visually at all.** Sugar-free from regular gum, a lily from a
  daylily at certain angles, a green tomato from an unripe one of an edible variety, a mushroom
  species. Some of these are the difference between fine and fatal.
- **It cannot account for preparation.** Cooked onion, raw onion and onion powder differ by an order
  of magnitude in concentration.
- **It is not a substitute for a poison hotline or a vet.** It should not try to be, and the UI
  should route people to one at every opportunity.

## 2. Ranked risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Confident misidentification produces a `safe` verdict for something toxic** | Medium | Catastrophic | Mandatory confirm screen; `confusable_with` alternates; model never emits verdicts; `model_fallback` capped below `safe`; conservative fuzzy threshold; escalation on `high_risk` items |
| 2 | **KB error** — a wrong verdict in the curated data | Low | Catastrophic | The editorial standard: ≥2 independent sources per entry, every claim checked against them, omission when sources disagree; fixture suite; a rehearsed correction path; "report a wrong answer" |
| 3 | **Legal exposure after a bad outcome** | Low | Severe | Narrow scope, ≥2 sources per entry, source-forward framing, omission under uncertainty, no charging, no data collection. Residual risk reduced, not removed (`docs/05-safety-legal.md` §6–§7) |
| 3b | **Unbounded API bill** — retry loop, scraper, or one abusive user | Medium | Severe | Global daily cap in KV + dashboard kill switch + provider quota caps + per-device rate limit, all built with the first model call (`docs/01-architecture.md` §6.3) |
| 4 | **App Store or Play rejection** | Medium | Delays launch | Declarations filed proactively; explicit review notes; no dosage calculator; "not a medical device" wording |
| 5 | **Provider deprecates or reprices the model** | High | Moderate | Adapter interface and config-driven selection, so a second provider is an adapter, not a rewrite (D24) |
| 6 | **Key extraction / cost abuse** | High if unmitigated | Moderate | The proxy exists precisely for this; the key never leaves the Worker; spend cap and rate limits. Attestation only if determined abuse appears |
| 7 | **KB curation stalls** — the unglamorous work that actually is the product | High | Severe | Treat KB authoring as a first-class scheduled workstream, not a side task; keep the target at 60–80 carefully sourced entries |
| 8 | **Users trust it too much** | High | Moderate | Copy discipline: "no known toxicity", never "safe"; the source shown above the fold; `unknown` never reassuring; the emergency screen one tap from every toxic result |
| 9 | **Latency makes the emergency case feel useless** | Medium | Moderate | Tiers 0–3; offline KB; hotline always one tap away regardless of network |
| 10 | **Photos leak location** | Low | Moderate | EXIF stripped on-device, verified by a CI check |
| 11 | **Missing Spanish alias makes a known item unfindable** | Medium | Moderate | Aliases authored by a native speaker as a search index, not translated; regional-variant fixtures; unresolved queries and wrong-answer reports reviewed |
| 12 | **Mistranslated KB prose produces a wrong verdict** | Low | Severe | Tier B never machine-translated to `approved`; reviewed by a native speaker against the English and its sources; no `toxic` entry ships below `approved` in Tiers A or B |

## 3. Where the real cost is

Not money. Running the app costs about $99 a year for Apple, $25 once for Google, and a couple of
euros a month of model spend once photo identification ships — everything else sits inside free
tiers (`docs/01-architecture.md` §6).

The real cost is **time on the knowledge base**: finding two independent authoritative sources for
each entry, reading them, writing both species in your own words, and doing it again in Spanish.
Weeks of work, not days. The UI is about 250 strings and is the easy half of localisation; the KB
sets the schedule. The controlled vocabulary and the two-tier translation model keep the Spanish
work to aliases and one-sentence answers (`docs/09-localisation.md` §1).

That is why the scope is 60–80 well-sourced entries and why the highest-expertise features are out
of scope. Plan the schedule around the KB, not around the React Native work.

## 4. Known-unknowns to resolve before photo identification ships

- Which model tier actually performs best on *this* task — build the image fixture set and evaluate
  against it before committing. Published benchmarks will not tell you how well a model
  distinguishes a daylily from a true lily.
- Open Food Facts coverage for Spanish supermarket products specifically — check a sample of real
  barcodes. Ingredient lists in languages other than English and Spanish are not matched at all
  (D29).
- Which Spanish variant is extended next. Peninsular (es-ES) ships first; serving Latin America is
  an alias-authoring job, not a translation job — `palta`/`aguacate`, `durazno`/`melocotón`,
  `frutilla`/`fresa` — plus a regional food list.

## 5. The small version ships first

The smallest version that is still honest and still useful is **typed lookups, no photos, no server
of ours, bundled KB** — and that, plus barcode scanning, is the first release
(`docs/07-implementation-plan.md`, D28).

It answers the majority of real queries (people mostly type "chocolate"), works offline, costs
nothing to run, has no API key to protect, no AI consent to collect, and far less to disclaim.
Photos are the expensive, risky, impressive half — genuinely valuable for plants and for unlabelled
packaging — and they follow in a second release, once the first shows anyone wants the app.
