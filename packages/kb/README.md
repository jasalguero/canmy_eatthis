# packages/kb

Empty on purpose. Phase 0 (this phase) only needs the workspace package to exist and resolve.

Phase 1 adds: `data/` (YAML entries), `schema/` (Zod validator matching
`docs/04-knowledge-base.md` §1), `src/build.ts` (emits `kb.json` + `kb.index.json`), and the
fixture suites described in `docs/07-implementation-plan.md` Phase 1.
