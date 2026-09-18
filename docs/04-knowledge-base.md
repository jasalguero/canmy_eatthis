# 04 — The Knowledge Base

The KB is the product. The app is a way of querying it. Budget accordingly: this is where the real
work sits, not in the React Native code.

> **Hobby build:** `docs/10-hobby-scope.md` §4 cuts this to **60–80 entries with ≥2 independent
> authoritative sources each**, and removes `mechanism` prose, `dose_bands`, and entry-specific
> emergency actions — the three most expertise-dependent fields. Read that section before authoring
> anything. The schema below keeps those fields documented for a future funded build; they are not
> populated now.

## 1. Entry schema

`packages/kb/data/*.yaml`, compiled to JSON by `packages/kb/build.ts`.

```yaml
id: chocolate_dark                    # stable, snake_case, never reused or renamed
display_name:
  en: Dark chocolate
  es: Chocolate negro
category: food                        # food | plant | medication | chemical | household | other
aliases:
  en: [dark chocolate, bittersweet chocolate, 70% cocoa, cocoa solids, baking chocolate]
  es: [chocolate negro, chocolate amargo, cacao puro]
confusable_with: [chocolate_milk, chocolate_white, carob]   # drives confirm-screen alternates
is_ingredient: true                   # can appear in a barcode-derived ingredient list
high_risk: true                       # forces escalation to the stronger vision model
species:
  dog:
    verdict: toxic
    severity: moderate
    headline:
      en: Toxic to dogs. Call your vet.
    summary:
      en: Dark chocolate contains theobromine, which dogs clear very slowly.
    mechanism:
      en: Theobromine and caffeine are methylxanthines...
    signs: [vomiting, diarrhoea, restlessness, tachycardia, tremors, seizures]   # controlled-vocabulary ids
    onset_hours: { min: 2, max: 12 }
    # ---- CUT in the hobby build (docs/10 §4): dose_bands, concentration, mechanism ----
    dose_bands:                       # mg theobromine per kg body weight
      - { max_mg_per_kg: 20,  band: low,      note_en: "Usually mild GI upset at most." }
      - { max_mg_per_kg: 40,  band: moderate, note_en: "Vets usually want to see the animal." }
      - { max_mg_per_kg: null, band: high,    note_en: "Treat as an emergency." }
    concentration: { theobromine_mg_per_g: 5.5 }
    emergency_actions: [call_vet_now, do_not_induce_vomiting, bring_packaging]   # controlled-vocabulary ids
    emergency_actions_extra:            # rare, entry-specific; free text, translated per entry
      en: []
  cat:
    verdict: toxic
    severity: moderate
    # ... same shape; cats and dogs differ and must be authored separately, never copied
sources:                              # MINIMUM TWO, independent, authoritative (docs/10 §4)
  - label: Merck Veterinary Manual — Chocolate toxicosis
    url: https://www.merckvetmanual.com/...
    accessed: 2026-09-17
  - label: "<second independent source>"
    url: https://...
    accessed: 2026-09-17
review:
  reviewed_by: "<vet name / licence>"
  reviewed_at: 2026-10-02
  status: approved                    # draft | needs_review | approved
translations:
  es:
    tier_a: approved     # aliases, display_name, bespoke Tier A overrides — MANDATORY
    tier_b: approved     # headline + summary                 (missing|machine|draft|approved)
    tier_c: missing      # mechanism, dose-band notes         — English fallback is acceptable
    translated_by: "<name>"
    reviewed_by: "<bilingual vet / medical translator>"
    reviewed_at: 2026-11-04
```

`signs` and `emergency_actions` are **controlled-vocabulary ids, not prose**. Across the whole KB
they collapse to roughly 120 terms, translated once in the UI catalogues rather than per entry.
This is what makes the mandatory translation tier affordable, and it also forces consistent phrasing
across 500 entries. See `docs/09-localisation.md` §1.

### Schema rules the build script enforces (build fails, not warns)

1. Every entry has **both** `species.dog` and `species.cat`. Authored separately — grapes, onions,
   lilies and paracetamol all differ sharply between the two, and a copy-paste here is a real hazard.
2. `verdict: toxic` ⇒ non-empty `emergency_actions` and `severity` set.
3. `verdict: toxic` or `caution` ⇒ **at least two independent `source` entries with URLs**
   (hobby-build editorial standard, `docs/10-hobby-scope.md` §4). If two good sources disagree, or
   coverage is thin, the entry does not ship — omission renders as `unknown`, which routes the user
   to a vet, and that is the correct outcome.
4. No entry ships to production with `review.status !== approved`.
5. `aliases` are unique across the whole KB — a collision is ambiguous and fails the build.
6. `confusable_with` ids all resolve.
7. No alias is a substring of a different entry's `display_name` without being listed in that
   entry's `confusable_with` (catches "onion" vs "onion powder" class errors).
8. `tier_a` is `approved` for every shipped language on every entry — no exceptions. `display_name`
   and `aliases` must exist even where the prose does not: the app must be able to *find* an entry
   before it can *explain* it.
9. `tier_b` is never `machine` or `draft` for an entry with `verdict: toxic` in a shipped language.
   Machine-translated safety answers do not reach users.
10. Every controlled-vocabulary id used by any entry exists in every shipped language's catalogue.
11. The build emits a per-language, per-tier coverage report, plus the count of toxic entries below
    `approved` in Tiers A and B. Those two numbers are release gates.

`tier_c: missing` is permitted and safe: the entry still renders its verdict structurally — colour,
glyph, verdict word, signs and emergency actions all come from UI strings and the controlled
vocabulary — and only the collapsed explanatory section falls back to English behind a visible
marker. See `docs/09-localisation.md` §2.

## 2. Licensing — read this before copying anything

The **facts** ("lilies are nephrotoxic to cats") are not copyrightable. The **compilations and the
prose** on ASPCA, Pet Poison Helpline and similar sites are. Scraping ASPCA's plant list into a
shipped commercial app is a real legal risk, and their terms prohibit it.

**The approach:**

- Build the entry list from multiple sources and from primary literature: the **Merck Veterinary
  Manual**, peer-reviewed veterinary toxicology papers, **USDA/FDA** materials (US government works
  are public domain), and university veterinary extension publications.
- **Write every description in your own words.** No paraphrase-close-to-source.
- Cite sources per entry — good practice, good UX, and evidence of provenance.
- Use public sources for *coverage discovery* (what belongs on the list) but not as the text.
- **Spanish Tier B prose is authored or translated by a bilingual veterinarian or a medical
  translator, then vet-reviewed.** Never machine-translated to `approved`. Spanish **aliases** are
  authored by a native speaker as a search index and need no veterinary review, because a search
  index makes no medical claim — see `docs/09-localisation.md` §4.
- **Open Food Facts / Open Pet Food Facts** are ODbL-licensed and *can* be used for barcode and
  ingredient data, with attribution and share-alike obligations. Read the licence; display the
  attribution.
- Have a veterinarian review and sign off. Record the sign-off in `review`.

## 3. Seeding priority

Build outward in this order; the first 60 entries cover the large majority of real queries.

**Tier 1 — the classics (≈60 entries, Phase 1).**
chocolate (dark/milk/white/cocoa powder) · xylitol/birch sugar · grapes, raisins, sultanas, currants ·
onion, garlic, leek, chive (raw, cooked, powdered) · macadamia · alcohol · caffeine · avocado ·
raw yeast dough · cooked bones · salt / play dough · paracetamol (acetaminophen) · ibuprofen ·
aspirin · nicotine and vapes · cannabis · lilies (cats — `severe`) · sago palm · azalea · oleander ·
tulip and daffodil bulbs · antifreeze/ethylene glycol · rodenticide · slug pellets ·
grape-seed-containing foods · nutmeg · unripe tomato/green potato · rhubarb leaves.

**Tier 2 — the reassurance set (≈120 entries, Phase 1).**
The things people check hoping for a yes: plain cooked chicken, rice, carrot, pumpkin, apple without
seeds, banana, blueberry, plain yoghurt, cucumber, green beans, peanut butter (**with a mandatory
xylitol warning**), cheese (`caution`, lactose/fat), egg, salmon, plain pasta, watermelon,
strawberry, catnip, wet/dry food of the other species (`caution`).

**Tier 3 — the long tail (Phase 8 onward).** Houseplants by genus · common medications · cleaning
products · garden chemicals · **regional foods, which are driven by region rather than language** —
jamón, turrón, aceitunas, mantecados for Spain; mole (contains chocolate), tamales, chile for
Mexico. Adding a region means adding entries, not only translating existing ones.

**Tier 4 — backfill from telemetry.** Every `verdict: unknown` and every `model_fallback` is logged
by normalised query string. That log is the KB roadmap; review it weekly.

## 4. Risk bands — CUT in the hobby build

> **Not built.** `docs/10-hobby-scope.md` §4 removes dose bands, pet weight input and risk banding
> entirely. They are the highest-expertise feature in the plan and should not exist without
> veterinary review. "Toxic — call your vet" is honest; "moderate risk for an 8 kg dog" is a
> clinical judgement. The section below is retained for a future funded build.

### Original: risk bands, and the line not to cross

`dose_bands` let a chocolate result say *"for an 8 kg dog, this amount is in the range where vets
usually want to see the animal"* instead of a useless bare "toxic". That is a large UX win.

**But do not build a dosage calculator.** Apple's guideline 1.4.1 requires drug-dosage calculators
to originate from a manufacturer, hospital, university, insurer, pharmacy or regulator. A
"chocolate toxicity calculator" presented with numeric precision invites that reading and invites
liability. The rules:

- Output a **band** (`low` / `moderate` / `high`), never a computed milligram figure shown to the user.
- Never state a threshold as a number in the UI.
- `riskBand` is `unknown` whenever weight or amount is missing — never estimate either.
- Every band, including `low`, ends with a call-your-vet line.
- Never tell a user their pet does **not** need to see a vet.

## 5. Distribution and updates

- **Bundled** with the binary: the full KB at build time, so the app works on first launch offline.
- **OTA**: `GET /v1/kb/manifest` on cold start, at most once per 24 h. Download, verify signature and
  SHA-256, swap atomically, keep the bundled copy as fallback. A corrupted or unverified download is
  discarded silently.
- KB version is shown in Settings and recorded on every history entry, so a past result can be
  explained.
- **Correction path:** edit YAML → PR → CI validates schema and runs the fixture suite → vet
  sign-off for any verdict change → publish manifest. Target: under 4 hours from report to users.
  Exercise this path once in Phase 10 before launch so it is known to work.

## 6. Test fixtures

`packages/kb/fixtures/` holds a golden set that CI runs on every commit:

- **Verdict fixtures** — `(kbId, species, weight, amount) → expected VerdictPayload`. Covers all
  four verdicts, both species, missing-context cases, and all invariants from `docs/03-api-contract.md`.
- **Resolution fixtures** — `input string → expected kbId | null`. Includes correct spellings,
  realistic typos, Spanish, plurals, brand names, and a **negative set of near-misses that must
  NOT match** ("onion powder" must not resolve to "onion ring"; "chocolate lab" must not resolve to
  "chocolate").
- **Image fixtures** — ~40 real photos with expected candidates. Run against recorded provider
  responses in CI (fast, deterministic, free) and against live providers in a nightly job, so
  provider drift is detected without making every CI run cost money.
