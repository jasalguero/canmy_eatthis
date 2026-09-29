# 04 — The Knowledge Base

The KB is the product. The app is a way of querying it. Budget accordingly: this is where the real
work sits, not in the React Native code.

**Scope:** 60–80 entries, each meeting the editorial standard in §2. No `mechanism` prose, no dose
bands, no entry-specific emergency instructions (`docs/00-product-spec.md` §6).

## 1. Entry schema

`packages/kb/data/*.yaml`, one file per entry, compiled to JSON by `packages/kb/src/build.ts`.
The Zod validator is `packages/kb/schema/entry.ts`.

```yaml
id: chocolate_dark                    # stable, snake_case, never reused or renamed; = filename
display_name:
  en: Dark chocolate
  es: Chocolate negro
category: food                        # food | plant | medication | chemical | household | other
aliases:
  en: [dark chocolate, bittersweet chocolate, cocoa solids, baking chocolate]
  es: [chocolate negro, chocolate amargo, chocolate puro]
confusable_with: [chocolate_milk]     # drives confirm-screen alternates
is_ingredient: true                   # can appear in a barcode-derived ingredient list
high_risk: true                       # forces escalation to the stronger vision model
species:
  dog:
    verdict: toxic                    # safe | caution | toxic | unknown
    severity: severe                  # mild | moderate | severe; only for toxic
    headline:
      en: Toxic to dogs. Call your vet now.
      es: Tóxico para perros. Llama ahora a tu veterinario.
    summary:
      en: Dark chocolate contains theobromine, which dogs clear very slowly...
      es: El chocolate negro contiene teobromina, que los perros eliminan muy despacio...
    signs: [vomiting, diarrhoea, restlessness, tachycardia, tremors, seizures]  # vocabulary ids
    onset_hours: { min: 2, max: 12 }  # only when a source states it; otherwise null
    emergency_actions: [call_vet_now, do_not_induce_vomiting, bring_packaging]  # the universal set
  cat:
    verdict: toxic
    severity: severe
    # ... same shape; cats and dogs differ and must be authored separately, never copied
sources:                              # at least two, independent, authoritative (§2)
  - label: Merck Veterinary Manual — Chocolate Toxicosis in Animals
    url: https://www.merckvetmanual.com/toxicology/food-hazards/chocolate-toxicosis-in-animals
    accessed: 2026-09-19
  - label: "<second independent source>"
    url: https://...
    accessed: 2026-09-19
review:
  reviewed_by: "Jose Salguero"        # the person who checked it against the editorial standard
  reviewed_at: 2026-09-28
  status: approved                    # draft | needs_review | approved
translations:
  es:
    tier_a: approved     # aliases, display_name — MANDATORY       (missing|machine|draft|approved)
    tier_b: approved     # headline + summary
    translated_by: "<name>"
    reviewed_by: "<native speaker>"
    reviewed_at: 2026-09-28
```

`signs` and `emergency_actions` are **controlled-vocabulary ids, not prose**
(`packages/kb/schema/vocab.ts`), translated once in `packages/kb/vocab/<lang>.json` rather than per
entry. This is what makes the mandatory translation tier affordable, and it forces consistent
phrasing across the KB. `emergency_actions` is deliberately the universal set only: call your vet or
a poison line now; do not induce vomiting unless told to; bring the packaging. See
`docs/09-localisation.md` §1.

### Schema rules the build script enforces (build fails, not warns)

1. Every entry has **both** `species.dog` and `species.cat`. Authored separately — grapes, onions,
   lilies and paracetamol all differ sharply between the two, and a copy-paste here is a real hazard.
2. `verdict: toxic` ⇒ non-empty `emergency_actions` and `severity` set.
3. `verdict: toxic` or `caution` ⇒ **at least two independent `source` entries with URLs** (§2).
   AGENTS.md #15 extends this to every entry, whatever its verdict.
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

## 2. The editorial standard

There is no veterinary sign-off, so the app does not present itself as an authority. It is **a
fast, well-organised index into authorities** — which is what a worried owner needs at 2 a.m.
anyway, since the useful action is almost always "call someone". That shapes the product:

- **The source is a primary UI element, not a footnote.** Every result shows, above the fold, which
  authority says this and a link to it: "The Merck Veterinary Manual lists dark chocolate as toxic
  to dogs →". The app's claim is about what the sources say, which is a claim it can support.
- **At least two independent authoritative sources per entry.** Acceptable: the Merck Veterinary
  Manual, peer-reviewed veterinary toxicology literature, university veterinary extension
  publications, and government materials (FDA, USDA, CDC, AEMPS). Pet blogs are not sources.
- **If two good sources disagree, or coverage is thin, the entry does not ship.** Uncertainty is
  handled by omission, and omission renders as `unknown` — which routes the user to a vet. That is
  the correct outcome.
- **Every claim in an entry is in its sources.** The verdict for each species, the signs, the onset
  window. A species the sources do not cover is `unknown` for that species.
- **No `mechanism` prose.** Explaining metabolism in your own words is where a non-expert most
  easily goes wrong, and it adds nothing a link cannot.
- **No dose bands, no weight input, no risk banding.** "Toxic — call your vet" is honest; "moderate
  risk for an 8 kg dog" is a clinical judgement.
- **Emergency actions are the universal set only**, identical across entries. Entry-specific medical
  instructions are exactly what cannot be written without review.
- **Plants get special handling.** They are the most dangerous category to misidentify. Typed plant
  lookups are fine. A photo-identified plant is always low confidence, always confirmed, and always
  shows a "plant identification from photos is unreliable — confirm with a vet" notice.

Hold the line when adding entries later. The temptation to add "just one more" unsourced item is
how a careful project stops being careful. If a vet is ever willing to review the entries as a
favour, take it — a plausible ask for a short list.

### Drafting and approval

New entries start in `packages/kb/drafts/`, which the build ignores; `packages/kb/src/drafts.test.ts`
validates each draft against the live KB so promotion cannot break the build. A reviewer opens both
sources, checks the verdict for each species and every claim against them, reads the Spanish as a
native speaker, then moves the file into `data/` and records `review` and `translations.es` as
approved. The steps are in `packages/kb/drafts/README.md`.

### The residual risk

Publishing a free pet-safety app without veterinary review carries real risk that no disclaimer
fully removes. The mitigations are genuine — narrow scope, strong sourcing, source-forward
presentation, omission under uncertainty, and routing every serious case to a professional. They
reduce the risk substantially. They do not eliminate it.

## 3. Licensing — read this before copying anything

The **facts** ("lilies are nephrotoxic to cats") are not copyrightable. The **compilations and the
prose** on ASPCA, Pet Poison Helpline and similar sites are. Scraping ASPCA's plant list into a
shipped app is a real legal risk, and their terms prohibit it.

- Build the entry list from multiple sources and from primary literature: the **Merck Veterinary
  Manual**, peer-reviewed veterinary toxicology papers, **USDA/FDA** materials (US government works
  are public domain), and university veterinary extension publications.
- **Write every description in your own words.** No paraphrase-close-to-source.
- Cite sources per entry — good practice, good UX, and evidence of provenance.
- Use public sources for *coverage discovery* (what belongs on the list) but not as the text.
- **Spanish prose is never machine-translated to `approved`.** Spanish **aliases** are authored by a
  native speaker as a search index — see `docs/09-localisation.md` §4.
- **Open Food Facts / Open Pet Food Facts** are ODbL-licensed and are used for barcode and
  ingredient data, with attribution in the app (D29).
- The KB entries themselves are licensed CC BY-NC 4.0 (`LICENSE-CONTENT`).

## 4. Seeding priority

Build outward in this order; the first entries cover the large majority of real queries.

**Priority 1 — the classics.**
chocolate (dark/milk/cocoa powder) · xylitol/birch sugar · grapes, raisins, sultanas, currants ·
onion, garlic, leek, chive · macadamia · alcohol · caffeine · avocado · raw yeast dough · salt /
play dough · paracetamol (acetaminophen) · ibuprofen · aspirin · nicotine and vapes · cannabis ·
lilies (cats — `severe`) · sago palm · azalea · oleander · spring bulbs · antifreeze/ethylene
glycol · rodenticide · slug pellets.

**Priority 2 — the reassurance set.**
The things people check hoping for a yes: plain cooked chicken, rice, carrot, pumpkin, apple without
seeds, banana, blueberry, plain yoghurt, cucumber, green beans, peanut butter (**with a mandatory
xylitol warning**), cheese (`caution`), egg, salmon, plain pasta, watermelon, strawberry, catnip.
Two sources that say a food is harmless are harder to find than two that say it is toxic; an entry
without them does not ship.

**Priority 3 — regional foods**, which are driven by region rather than language: jamón, turrón,
aceitunas for Spain; mole (contains chocolate), tamales, chile for Mexico. Adding a region means
adding entries, not only translating existing ones.

**Backfill.** Every typed query that ends in `unknown` is a candidate entry. The "report a wrong
answer" inbox is the other input.

## 5. Distribution and updates

- **Bundled** with the binary: the full KB at build time, so the app works on first launch offline
  (D21).
- **OTA** (after the first release, `docs/07-implementation-plan.md`): `GET /v1/kb/manifest` on cold
  start, at most once per 24 h. Download, verify signature and SHA-256, swap atomically, keep the
  bundled copy as fallback. A corrupted or unverified download is discarded silently.
- KB version is shown in Settings and recorded on every history entry, so a past result can be
  explained.
- **Correction path:** edit YAML → PR → CI validates schema and runs the fixture suite → the change
  meets the editorial standard → release. Exercise this path once in Phase 6 before launch so it is
  known to work.

## 6. Test fixtures

`packages/kb/fixtures/` holds a golden set that CI runs on every commit:

- **Verdict fixtures** — `(kbId, species) → expected VerdictPayload`. Covers all four verdicts, both
  species, and all invariants from `docs/03-api-contract.md`.
- **Resolution fixtures** — `input string → expected kbId | null`. Includes correct spellings,
  realistic typos, Spanish, plurals, brand names, and a **negative set of near-misses that must
  NOT match** ("onion powder" must not resolve to "onion ring"; "chocolate lab" must not resolve to
  "chocolate").
- **Image fixtures** — real photos with expected candidates, for photo identification. Run against
  recorded provider responses in CI (fast, deterministic, free) and against the live provider in a
  nightly job, so provider drift is detected without making every CI run cost money.
