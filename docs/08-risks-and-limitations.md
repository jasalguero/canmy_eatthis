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
| 2 | **KB error** — a wrong verdict in the curated data | Low | Catastrophic | Vet sign-off per entry; sourced citations; fixture suite; a rehearsed <4 h OTA correction path |
| 3 | **Legal exposure after a bad outcome** | Low | Severe | Hobby build: narrow scope, ≥2 sources per entry, source-forward framing, omission under uncertainty, no charging, no data collection. Residual risk reduced, not removed (`docs/10` §5) |
| 3b | **Unbounded API bill** — retry loop, scraper, or one abusive user | Medium | Severe *for an unfunded project* | Global daily cap in KV + dashboard kill switch + provider quota caps + per-device rate limit, all built with the first model call (`docs/10` §3) |
| 4 | **App Store or Play rejection** | Medium | Delays launch | Declarations filed proactively; explicit review notes; no dosage calculator; "not a medical device" wording |
| 5 | **Provider deprecates or reprices the model** | High | Moderate | Adapter interface, two providers from day one, config-driven selection |
| 6 | **Key extraction / cost abuse** | High if unmitigated | Moderate | The proxy exists precisely for this; attestation + rate limits before production |
| 7 | **KB curation stalls** — the unglamorous work that actually is the product | High | Severe | Treat KB authoring as a first-class scheduled workstream, not a side task; budget the veterinary review |
| 8 | **Users trust it too much** | High | Moderate | Copy discipline: "no known toxicity", never "safe"; a call-your-vet line in every band including `low` |
| 9 | **Latency makes the emergency case feel useless** | Medium | Moderate | Tiers 0–3; offline KB; hotline always one tap away regardless of network |
| 10 | **Photos leak location** | Low | Moderate | EXIF stripped on-device, verified by a CI check |
| 11 | **Missing Spanish alias makes a known item unfindable** | Medium | Moderate | Aliases authored by a native speaker as a search index, not translated; regional-variant fixtures; unresolved-query telemetry reviewed weekly |
| 12 | **Mistranslated KB prose produces a wrong verdict** | Low | Severe | Tier B never machine-translated to `approved`; bilingual vet or medical translator + vet review; no `toxic` entry ships below `approved` in Tiers A or B |

## 3. Where the real cost is

> **Hobby build:** superseded by `docs/10-hobby-scope.md` §2. The short version: ~$99/year for
> Apple, $25 once for Google, everything else inside free tiers, and about a euro a month of model
> spend. The vet and legal line items below do not exist, which is exactly why the scope is cut to
> 60–80 well-sourced entries and the highest-expertise features are removed. The analysis below
> applies to a funded build.

### Original: where the real cost is

Not the model bill. At roughly **$0.0003 per amortised check**, 100,000 checks a month costs about
$30 — less than the Apple developer account. The Cloudflare Worker at this scale is effectively free.

The real costs are:

1. **Veterinary review of the knowledge base** — a licensed vet reading and signing off several
   hundred entries, and re-reviewing on change. This is the largest single line item and the one
   most likely to be under-budgeted. **Each additional language adds to it**, though the tiered
   translation model in `docs/09-localisation.md` §1 holds that to roughly a third of what
   translating the whole KB would cost: aliases need a native speaker but no vet, the ~120-term
   controlled vocabulary is translated once, only the one-sentence answers need the medical bar,
   and long-form explanation stays English behind a marker. Still, launch with two languages and
   add more only on evidence of demand.
2. **Legal** — terms, privacy policy, liability review, possibly incorporation.
3. **KB authoring time** — several hundred entries, bilingual, sourced. Weeks of work, not days.
   The UI is about 250 strings and is the easy half of localisation. The KB is the half that sets
   the schedule: ~1,620 strings per language under the tiered model, of which ~1,000 need the
   medical-translation bar.

Plan the schedule around these, not around the React Native work.

## 4. Known-unknowns to resolve before Phase 5

- Which model tier actually performs best on *this* task — build the 40-image fixture set in
  Phase 1 and evaluate the candidates against it before committing. Published benchmarks will not
  tell you how well a model distinguishes a daylily from a true lily.
- Whether specialist plant-ID accuracy justifies its cost and a second vendor relationship.
- Open Food Facts coverage for Spanish supermarket products specifically — verify with a sample of
  real barcodes before promising the barcode feature.
- Whether the chosen provider's default API tier trains on inputs, and whether a no-training tier
  is available at the target price.
- Which Spanish variant ships first. Peninsular (es-ES) is the default given the developer's market,
  but serving Latin America is an alias-authoring job, not a translation job — `palta`/`aguacate`,
  `durazno`/`melocotón`, `frutilla`/`fresa` — plus a different Tier 3 food list. Decide before
  Phase 1 alias authoring starts, because retrofitting is a per-entry pass.

## 5. If you wanted to cut scope

The smallest version that is still honest and still useful:

**Text input only. No photos. No server. Bundled KB. One language. Ship in two weeks.**

It answers the majority of real queries (people mostly type "chocolate"), works offline, costs
nothing to run, has no API key to protect, no AI consent to collect, and far less to disclaim.
Keep the i18n scaffolding from Phase 0 even in this version — it is cheap to build in and expensive
to retrofit — but ship one language's content and add the second once there is demand.
Photos are the expensive, risky, impressive half — and they are genuinely valuable for plants and
for unlabelled packaging. But if the goal is to find out whether anyone wants this, the text-only
version tests that for a fraction of the effort, and Phases 0, 1, 2 and 4 of this plan are exactly
that version.
