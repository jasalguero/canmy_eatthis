# 00 — Product Specification

## 1. Users and job to be done

A dog or cat owner, standing in the kitchen or the garden, usually mildly panicked, usually one-handed.
Two distinct modes:

- **Preventive** — "can I give him this?" Calm, low stakes, wants a fast yes/no.
- **Emergency** — "she just ate this." High stress, needs the phone number of a poison hotline in one
  tap and nothing standing between them and it.

The UI must serve the emergency case without making the preventive case feel alarming. In practice
this means: identical input flow, radically different verdict screens.

## 2. Screens

### 2.1 Home (the only screen the user needs to learn)

```
┌──────────────────────────────┐
│   ╭─────────╮ ╭─────────╮    │   Species toggle — segmented control
│   │  🐕 Dog │ │  🐈 Cat │    │   Dog preselected, persisted per user
│   ╰─────────╯ ╰─────────╯    │   Switching re-runs the last check if one is on screen
├──────────────────────────────┤
│                              │
│    ┌────────────────────┐    │
│    │                    │    │   Photo tray
│    │   [+]  [img] [img] │    │   Horizontal strip. Empty state = one large
│    │                    │    │   dashed "Add photo" tile.
│    └────────────────────┘    │   Tap [+] → action sheet: Camera / Library / Scan barcode
│                              │   Tap a thumb → full screen, with Remove
│    ┌────────────────────┐    │
│    │ What is it?        │    │   Text field, multiline, grows to 4 lines
│    │                    │    │   Placeholder rotates: "dark chocolate",
│    │                    │    │   "the white flowers in the garden",
│    └────────────────────┘    │   "sugar-free chewing gum"
│                              │
│         ┌──────────┐         │
│         │  Check   │         │   Disabled until ≥1 photo OR ≥2 chars of text
│         └──────────┘         │   Primary, full-width, thumb-reachable
└──────────────────────────────┘
```

The species toggle occupies the top ~12% of the screen; input takes the rest. The Check button is
pinned above the keyboard when the text field has focus.

**Validation.** At least one of {photos, text} must be non-empty. The button is disabled, not
error-throwing. Below it, a single quiet line explains why when disabled: *"Add a photo or describe
what it is."*

**Encouraging both.** When only a photo is present, the placeholder in the text field changes to
*"Anything you can add helps — brand, colour, where you found it"*. Text plus image measurably
improves identification and costs nothing extra.

### 2.2 Identifying (transient)

Shown while the request is in flight. Not a spinner over a blank screen — the user's photo stays
visible with a scanning shimmer over it, and a status line steps through: *Looking at your photo… →
Checking the veterinary database…*. Target p95 under 3 seconds. Cancellable.

### 2.3 Confirm (the safety gate)

**This screen is mandatory and must not be optimised away.**

```
   I think this is:

   ┌────────────────────────────────┐
   │ 🍫  Dark chocolate bar         │  ← primary candidate, confidence shown as
   │     70% cocoa, packaged         │     a word not a number ("fairly sure")
   └────────────────────────────────┘

   Not right?
   ○ Milk chocolate
   ○ Carob
   ○ Something else…            ← opens text field, re-runs resolution

              [ Yes, that's it ]
```

- Skipped only when the resolution came from an exact barcode match or an exact KB text match
  (user typed "chocolate" — there is nothing to confirm).
- Always shown for any photo-derived identification.
- Always shown when confidence is below the high threshold, regardless of source.
- The alternates are the model's other candidates plus any KB entries that are known confusables
  of the primary (see `confusable_with` in the KB schema) — this is how "lily" offers "daylily"
  and "peace lily" without the model having to think of it.

### 2.4 Result

Four variants, one per verdict. Shared anatomy:

```
   ┌──────────────────────────────┐
   │      [verdict banner]        │   Full-bleed colour, large glyph, one-word verdict
   │        Dark chocolate         │   Item name
   │          for Max 🐕           │   Pet name if profile set, else "for dogs"
   ├──────────────────────────────┤
   │  One-sentence plain answer.  │   The line the user actually reads
   ├──────────────────────────────┤
   │  "Merck Vet Manual says…" →  │   SOURCE, above the fold. The app's actual claim
   │  Signs to watch for  ▾       │   Collapsible, from the controlled vocabulary
   │  What to do now              │   Present on toxic/caution; NOT collapsible on toxic
   │  More sources  ▾             │   Remaining citations + KB version
   ├──────────────────────────────┤
   │  [ Call poison control ]     │   Toxic only. Sticky footer. tel: link.
   │  [ Check something else ]    │
   └──────────────────────────────┘
```

### 2.5 Secondary screens

- **History** — past checks, offline-readable, searchable. Tapping one re-opens its Result.
- **Pet profile** — species and name only. **Weight is cut** along with risk banding
  (`docs/10-hobby-scope.md` §4).
- **Settings** — language, units, disclaimers, privacy policy, hotline region, subscription.
- **First-run** — three cards: what the app does, what it is not (not a vet, not a diagnosis),
  and AI-processing consent (required — see `docs/05-safety-legal.md`).

## 3. Verdict taxonomy

Four verdicts. The brief asked for three; the fourth is non-negotiable, because an identification
failure must never render as green.

| Verdict | Colour | Glyph | Meaning | Copy pattern |
|---|---|---|---|---|
| `safe` | green | ✓ | No known toxicity for this species in normal amounts | "No known toxicity for dogs." |
| `caution` | amber | ! | Not toxic, but not a good idea — GI upset, fat, salt, sugar, choking, bones, obstruction | "Not toxic, but not great." |
| `toxic` | red | ⚠ | Known toxic. Carries `severity` and mandatory `emergency_actions` | "Toxic to cats. Call a vet." |
| `unknown` | amber-grey | ? | Could not identify confidently, or identified but absent from the KB | "I couldn't identify this confidently." |

**`toxic.severity`** ∈ `mild` \| `moderate` \| `severe`. `severe` (lily for cats, xylitol,
anticoagulant rodenticide, antifreeze) promotes the hotline CTA to the top of the screen above the
fold and adds a persistent banner.

**Hard rule: `unknown` is never rendered in green and never renders reassuring copy.** Its body text
is *"I couldn't identify this confidently. Don't assume it's safe — if your pet has already eaten it,
call your vet or a poison hotline."*

**Hard rule: the word "safe" is never used as a bare claim.** Copy says *"no known toxicity"*,
*"generally well tolerated"*. Never *"This is safe"*. This is both honest and materially reduces
liability exposure.

## 4. Copy rules

- Second person, present tense, no exclamation marks on toxic screens.
- Never hedge on an emergency: *"Call your vet now"*, not *"you may wish to consider contacting"*.
- Never speculate beyond the KB entry. The hobby build has no `mechanism` prose at all — the
  source link carries that job, and nothing is filled in by the model at render time.
- Numbers only where the KB supplies them with a source.
- Every result screen ends with the standing disclaimer in muted text.

## 5. Localisation

English and Spanish from day one, architected for more. Not a polish item: poison-control hotlines
are country-specific, the KB needs Spanish aliases for text lookup to work at all ("uvas",
"cebolla", "xilitol"), and Spanish text runs 20–30% longer, which reshapes the verdict banner.

Two settings, not one. **Language** picks the UI strings and the KB prose; **region** picks the
hotlines, the weight units and the regional food coverage. A Spanish speaker in the US gets Spanish
text and US hotline numbers.

Verdict labels are designed per language rather than translated — "Not great" becomes "Mejor
evitarlo", chosen by a native speaker to stay short and scannable in a banner.

The knowledge base is translated in tiers, not wholesale: aliases and the short safety strings are
mandatory, the one-sentence answer follows, and long-form explanation may stay English behind a
marker.

Full treatment in `docs/09-localisation.md`. Architect for it in Phase 0; do not retrofit.

## 6. Explicitly out of scope for v1

Accounts and cloud sync · social/sharing features · symptom checkers · vet appointment booking ·
multiple pet profiles · dosage calculators and risk bands (see `docs/10-hobby-scope.md` §4) ·
ingredient-level analysis of full pet-food labels · Apple Watch · **monetisation of any kind**.
