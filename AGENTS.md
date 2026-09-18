# Conventions for implementing agents

Read `README.md`, then **`docs/10-hobby-scope.md`**, then `docs/07-implementation-plan.md`, then the
doc for your phase. Doc 10 overrides everything else where they conflict — it cuts roughly a third
of the features described in docs 00–09. Do not build anything on its cut list (§8). Do not start a
phase whose dependencies are not complete.

## Hard rules

1. **The model never produces a verdict.** It produces candidate identifications. Verdicts come from
   `resolveVerdict()` reading the curated KB. If you find yourself prompting a model with "is this
   toxic", stop.
2. **`unknown` is never rendered green and never carries reassuring copy.**
3. **The word "safe" is never used as a bare claim** in any user-facing string. Use "no known
   toxicity". There is a CI grep for this.
4. **The emergency path — toxic verdict and hotline CTA — must work offline, logged out, unpaid and
   over quota.** Any change that could break that needs an explicit test.
5. **Resolution logic lives only in `packages/shared`**, so the app and the Worker cannot disagree.
6. **No secrets in the repo.** No API keys in the app, in any form, ever.
7. **No colour literals outside `apps/mobile/src/theme/`.** No Tailwind default palette classes.
8. **Every KB entry ships with its sources** and with both species authored separately.
9. **Zod schemas in `packages/shared` are the single source of truth for types.** Infer, never
   hand-write alongside.
10. **When uncertain, return `unknown`.** Optimism is the failure mode that hurts animals.
11. **No user-facing string literals in components.** Every one goes through `t()` with a translator
    comment, in `en` and `es`. Never concatenate sentence fragments — use full ICU messages with
    placeholders, because word order differs between languages.
12. **Language and region are separate settings.** Language picks the text; region picks the poison
    hotlines, the weight units and the regional food coverage. Never derive one from the other.
13. **`signs` and `emergency_actions` are controlled-vocabulary ids, never per-entry prose.**
    Translated once in the UI catalogues. Adding a bespoke phrasing where a vocabulary term exists
    is a review failure.
14. **Tier A (aliases, display names, safety strings) is mandatory in every shipped language.**
    Tier B prose is never machine-translated to `approved`, and no `toxic` entry ships below
    `approved` in Tiers A or B. Tier C may stay English behind a visible marker.
15. **Every KB entry carries at least two independent authoritative sources.** If two good sources
    disagree, or coverage is thin, the entry does not ship. Omission is a correct outcome.
16. **No `mechanism` prose, no dose bands, no pet weight, no entry-specific emergency actions.**
    These are cut (`docs/10-hobby-scope.md` §4). Link to the source instead.
17. **The global daily spend cap and kill switch ship in the same commit as the first model call.**
    Not a follow-up task. An unbounded bill is the one failure this project cannot absorb.
18. **No monetisation code anywhere.** No RevenueCat, no quotas, no subscription state.

## Definition of done for any task

- Types check, lint passes, tests pass, CI green
- New behaviour has a test; new user-facing strings exist in both `en` and `es`
- New components are dark-mode correct and accessible
- Anything touching a verdict has a fixture
- The phase's acceptance checklist is ticked with evidence, not assertion

## Before you deviate

If a decision in `docs/02-tech-decisions.md` seems wrong, say so and add a new entry recording the
change and the reason. Do not silently diverge — another agent is building against it.
