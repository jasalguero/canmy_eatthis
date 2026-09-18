# 09 — Localisation

Launch languages: **English** and **Spanish**. Architected for N languages from Phase 0, because
retrofitting i18n into a shipped app is several times the work of building it in.

> **Hobby build:** the model below is unchanged in principle but much smaller in practice. With
> 60–80 entries and no `mechanism` prose, **Tier C disappears entirely** and Tiers A and B come to
> roughly 250 short strings per language. More importantly the cost was "hire a bilingual vet", and
> that is no longer the shape of the work — you are authoring the English yourself from cited
> sources, so the Spanish is your own time rather than anyone's invoice. See
> `docs/10-hobby-scope.md` §6.

## 1. How much of the knowledge base actually has to be translated

The tempting answer is "translate the UI, leave the knowledge base in English." That is close to
right, and it is much cheaper than translating everything — but taken literally it breaks the app
for Spanish speakers, in one specific place.

**Aliases are not prose. They are the search index.** If the KB is entirely English, a user typing
`cebolla` matches nothing. Tiers 0 and 1 of the resolution pipeline — the instant, offline, free
path that handles most real queries — fail completely. The app either says "not sure" about onion,
or burns a model call to translate a word it already knows. Aliases must be multilingual regardless
of what happens to the prose, and fortunately they are the cheapest part: a native speaker listing
what people type, with no veterinary review needed, because a search index carries no medical claim.

So the useful question is not *whether* to translate the KB but *which fields*. Three tiers:

| Tier | Fields | Translate? | Why | Volume per language |
|---|---|---|---|---|
| **A — functional** | `aliases`, `display_name`, verdict labels, `signs`, `emergency_actions` | **Always, before launch** | Either search-index data or the short safety-critical strings a panicking user acts on | ~500 names + ~120 controlled terms |
| **B — the answer** | `headline`, `summary` | **Before that language's launch** | The one or two sentences the user actually reads | ~1,000 short strings |
| **C — the detail** | `mechanism`, `dose_band` notes, source labels | **Fall back to English indefinitely** | Collapsed-by-default explanatory depth; a motivated reader can cope with English | ~1,500 strings, deferred |

Tier C is where most of the word count lives, and it is exactly the part that can stay English. That
is your instinct, and it holds — for that tier.

### The trick that makes Tier A cheap

`signs` and `emergency_actions` look like thousands of strings of per-entry prose. They are not, if
they are modelled correctly: across the whole KB they collapse to **a controlled vocabulary of
roughly 120 terms**. "Vomiting", "tremors", "rapid heartbeat", "call your vet now", "do not induce
vomiting unless told to", "bring the packaging with you" recur across hundreds of entries.

So they become enum ids in the KB, translated **once** in the UI catalogues:

```yaml
signs: [vomiting, diarrhoea, restlessness, tachycardia, tremors, seizures]
emergency_actions: [call_vet_now, do_not_induce_vomiting, bring_packaging]
```

A handful of entries need something bespoke; those get a free-text override field that *is*
translated per entry. Everything else is free after the first 120 terms.

This is worth doing even for a single-language app — it makes the copy consistent across 500 entries
instead of 500 slightly different phrasings of "call your vet".

### What this costs, compared with the two extremes

- **Translate everything:** ~3,500 strings of medical prose per language, all needing a bilingual vet
  or medical translator plus veterinary review. Roughly doubles the largest line item in the project.
- **Translate nothing but the UI:** ~250 strings, but Spanish text lookup does not work, which is the
  app's core value for those users.
- **Tiers A + B:** ~1,620 strings, of which only the ~1,000 in Tier B are real prose needing the
  medical-translation bar. Aliases need a native speaker, not a vet. **Call it a third of the full
  cost for nearly all of the user-visible benefit.**

Recommendation: **Tier A always, Tier B before Spanish launch, Tier C English with a visible marker,
translated later if the market justifies it.**

## 2. Why partial translation is safe here

**A verdict is data, not prose.**

`verdict: toxic`, `severity: severe` and the presence of emergency actions are structural fields.
The verdict colour, the glyph, the verdict word, the risk band and the emergency call-to-action all
render from **UI strings**, which are fully translated, and from the Tier A controlled vocabulary.
None of it comes from KB prose.

So an entry whose Tier C text is still English gives a Spanish user: the right colour, the right
verdict word, the right severity treatment, the right list of signs to watch for, the right
emergency instructions and a working hotline button. Only the collapsed "Why" section shows English,
behind a small *"Shown in English"* marker.

Without this property, partial translation would be unsafe and the choice would be all-or-nothing
per language. With it, translation coverage becomes a dial rather than a gate.

**The one hard floor:** an entry may not ship with an untranslated or machine-translated Tier A field
in a shipped language. The strings a frightened person acts on are not where you economise.

## 3. Language is not region

Keep these as two independent settings. Conflating them is the most common i18n bug in apps like
this, and here it has safety consequences.

| Concern | Driven by | Example |
|---|---|---|
| UI strings, KB prose | **language** (`es`) | A Spanish speaker in Ohio gets Spanish text |
| Poison-control hotlines | **region** (`US`) | …and US hotline numbers, because that is who can help them |
| Weight units | **region**, user-overridable | kg in Spain, lb in the US |
| Food coverage (Tier 3 KB) | **region** | turrón and jamón for Spain; mole and tamales for Mexico |
| Date and number formatting | **locale** | `Intl.DateTimeFormat`, `Intl.NumberFormat` |
| Store listing and ASO | **both** | es-ES and es-MX listings differ |

Defaults come from `expo-localization`. Both are overridable in Settings, independently — someone
who has moved country needs to change region without changing language, and vice versa.

## 4. Alias authoring

The most important localisation work in this project, and the part that cannot be skipped.

The Spanish alias list for `onion` is not "translate the word onion". It is **"what do Spanish
speakers actually type into this box?"** A missing alias is a silent failure: the app returns "not
sure" for something it knows perfectly well.

**Regional vocabulary is functional, not stylistic.** Without these, lookups simply fail:

| Peninsular | Latin American |
|---|---|
| aguacate | palta (Southern Cone) |
| melocotón | durazno |
| fresa | frutilla (Southern Cone) |
| maíz | choclo, elote |
| gamba | camarón |
| patata | papa |
| zumo | jugo |
| pimiento | ají, chile, morrón |
| cacahuete | maní |
| judías verdes | ejotes, chauchas, vainitas |

**Rules:**

1. Authored by a native speaker of the target variant, never translated from English.
2. Include every regional variant of the language you serve, in one list. Extra aliases cost only
   index size; a miss costs a failed lookup.
3. Include common misspellings and un-accented forms (`limon`, `platano`, `xilitol`).
4. Include brand names sold in that market.
5. Aliases stay globally unique across the KB — the build enforces it, and it gets harder with more
   languages. A collision between an English and a Spanish alias for *different* entries fails the
   build and must be resolved by qualifying one.

**Normalisation** (`normalise()` in `packages/shared`) strips diacritics and folds `ñ`→`n`, `ü`→`u`
before matching, so `limón`/`limon` and `piña`/`pina` collapse to one key. Extend its fixture set per
language.

**Fallback worth having:** when a query matches nothing in the user's language, retry the match
against *all* languages' alias indices before giving up. An English alias hit for a Spanish user
still yields the right entry and the right translated verdict — Tier A is translated, so the answer
is fully usable. Cheap, and it catches gaps in the Spanish alias list before a user notices them.

## 5. KB schema additions

```yaml
signs: [vomiting, tremors, tachycardia]        # controlled vocabulary ids, translated once in UI
emergency_actions: [call_vet_now, do_not_induce_vomiting]
translations:
  es:
    tier_a: approved       # aliases + display_name + any bespoke Tier A overrides
    tier_b: approved       # headline + summary        (missing | machine | draft | approved)
    tier_c: missing        # mechanism + notes         — English fallback is acceptable
    translated_by: "<name>"
    reviewed_by: "<bilingual vet / medical translator>"
    reviewed_at: 2026-11-04
```

**Build-time rules (fail, not warn):**

1. `tier_a` must be `approved` for every shipped language on every entry. No exceptions.
2. `tier_b` may not be `machine` or `draft` for any entry with `verdict: toxic` in a shipped
   language. Machine-translated safety answers do not reach users.
3. `tier_c: missing` is permitted and renders an English-fallback marker.
4. Every controlled-vocabulary id used by any entry exists in every shipped language's catalogue.
5. The build emits a per-language coverage report — per tier, plus the count of toxic entries below
   `approved` in Tiers A and B. Those two numbers are release gates.

Emit one KB artefact per language plus a shared structural core, so a device downloads only the
prose it needs.

## 6. Copy rules for translatable source text

Writing the English source with translation in mind costs nothing and saves a lot of rework.

- **Avoid gender agreement traps.** Spanish adjectives agree with what they modify. Prefer *"Llama a
  tu veterinario"* over constructions needing *intoxicado/intoxicada*. If pet sex is ever collected
  it is for grammar, not for anything medical.
- **Never concatenate sentence fragments.** No `t('is') + item + t('toxic')` — word order differs.
  Full ICU messages with placeholders: `t('verdict.toxic.headline', { item, species })`.
- **ICU MessageFormat from day one** (`i18next-icu`). English and Spanish both have two plural forms,
  so ICU looks like overhead now; Polish, Russian and Arabic do not, and adopting it later is a full
  re-key.
- **Never embed number formatting in a string.** Pass the value, format with `Intl`.
- **Verdict words are designed per language, not translated.** "Not great" has no direct equivalent.
  Each language gets a short, scannable, clinically accurate label chosen by a native speaker — this
  is copywriting, not localisation.
- **Every string has a translator comment.** `t('check')` is ambiguous ("to check" / "a cheque").

Proposed verdict labels (to be confirmed by a native speaker, not final):

| Verdict | en | es |
|---|---|---|
| safe | No known risk | Sin riesgo conocido |
| caution | Not great | Mejor evitarlo |
| toxic | Toxic | Tóxico |
| unknown | Not sure | No estoy seguro |

## 7. Layout consequences

Spanish runs **20–30% longer** than English. Combined with Dynamic Type at 200%, that is the
worst-case layout, and it lands on the verdict banner — the most designed screen in the app.

- Verdict banners, buttons and section headers survive 30% expansion without truncation. Test at
  `es` + 200% font scale as a named acceptance case in Phase 2.
- No fixed-width text containers. No `numberOfLines={1}` on anything carrying meaning.
- **Logical layout properties everywhere** — `marginStart`/`marginEnd`, `textAlign: 'start'` — never
  `left`/`right`. Neither launch language is RTL; this costs nothing now and is the difference
  between a week and a month if Arabic is ever added.
- **Pseudo-localisation** in dev builds: a fake locale that accents every character and pads strings
  40%. Surfaces hardcoded strings and layout breaks with no translator involved.

## 8. The model and language

- The vision model **identifies in a canonical form** and returns a KB candidate. Display names come
  from the KB in the user's language. On the normal path the model produces no user-facing prose, so
  the normal path carries no translation-quality risk at all.
- The prompt must state that **text visible in the image may be in any language** — a Spanish
  ingredient panel, a German brand name — and that it should be returned verbatim as seen.
- On the `model_fallback` path the model *does* produce user-facing text. Instruct it to respond in
  the user's language; that output is already capped at `caution`/`unknown` and marked unverified.
  Cap it further: fallback prose is a short factual description only, **never emergency
  instructions**, which come solely from the Tier A controlled vocabulary.

## 9. Translation pipeline

- **Source of truth:** `en` JSON catalogues for UI and controlled vocabulary; `en` YAML for the KB.
- **Tooling:** i18next + `i18next-icu` + `expo-localization`. Namespaces: `common`, `home`, `result`,
  `errors`, `onboarding`, `legal`, `vocab`.
- **UI strings and controlled vocabulary:** machine-translated seed, then native-speaker review. The
  vocabulary is small and high-leverage — review it carefully once and it is done for every entry.
- **Aliases:** native speaker, no veterinary review (a search index makes no medical claim).
- **Tier B prose:** bilingual vet or medical translator, then veterinary review. Never
  machine-translated to `approved`.
- **Tier C:** English fallback, marked in the UI. Translate later if the market justifies it.
- **Legal text** (disclaimer, ToS, privacy policy): legal translator, reviewed for validity in each
  jurisdiction. A disclaimer not valid in the user's language and jurisdiction is not a disclaimer.
  Launch blocker per language.
- **Hotlines:** verified by a human per region, recording the number *and* the languages that service
  operates in. Telling a Spanish speaker to call an English-only line is a failure.
- **Fallback chain:** `es-MX` → `es` → `en`. CI fails the build on any missing UI or vocabulary key
  in a shipped language.

## 10. Acceptance criteria (mirrored into the phase plan)

- **Phase 0:** i18next + ICU wired; `en`/`es` namespaces; pseudo-locale in dev; language and region
  as separate persisted settings; `normalise()` fixtures cover Spanish diacritics.
- **Phase 1:** controlled vocabulary extracted and translated; `display_name` and `aliases` in both
  languages on every entry, Spanish authored by a native speaker; per-tier coverage report emitted.
- **Phase 2:** every screen correct at `es` + 200% font scale; pseudo-locale finds zero hardcoded
  strings; CI grep finds no `left`/`right` layout properties.
- **Phase 4:** Spanish and un-accented Spanish resolve offline; cross-language alias fallback works;
  a `tier_c: missing` entry still renders a fully usable Spanish result with an English-prose marker.
- **Phase 7:** disclaimer, ToS and privacy policy legally reviewed per language; hotline language
  coverage recorded.
- **Phase 8:** Spanish Tier A at 100% `approved`; Tier B ≥95%, and **100% for every `toxic` entry**.
- **Phase 10:** store listings, screenshots and keywords per locale; a native speaker has walked the
  full flow in Spanish, including an emergency result.
