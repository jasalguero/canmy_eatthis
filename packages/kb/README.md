# packages/kb

The knowledge base: source data, schema, build pipeline and fixtures
(`docs/04-knowledge-base.md`, `docs/07-implementation-plan.md` Phase 1 / `docs/10-hobby-scope.md`
§7 "H1").

- `schema/entry.ts` — Zod validator for one YAML entry (per-entry rules only; cross-entry rules
  live in `src/build.ts`, which needs the whole KB).
- `schema/vocab.ts` — the controlled-vocabulary ids for `signs` and `emergency_actions`.
- `vocab/{en,es}.json` — translations of those ids. **`es.json` is a draft, not yet
  native-speaker reviewed** — see `vocab/README.md`.
- `data/*.yaml` — one file per entry, filename must match the entry's `id`.
- `src/build.ts` — validates every entry, runs the cross-entry checks (alias uniqueness,
  `confusable_with` resolution, the substring check, vocab coverage), and emits `dist/kb.json`,
  `dist/kb.index.json`, one `dist/kb.<lang>.json` per language, and `dist/coverage-report.json`
  (gzipped alongside the raw JSON, SHA-256 logged to stdout).
- `fixtures/` — the resolution and verdict fixture suites `docs/04-knowledge-base.md` §6
  describes, consumed by this package's and `packages/shared`'s tests.

Run `pnpm --filter @canmyeatthis/kb build` to build. `review.status` and `translations.es` on
individual entries reflect the hobby-build editorial standard (no vet, no native-speaker review
yet) — see `docs/02-tech-decisions.md` D17 before changing what the build enforces.
