/**
 * Placeholder package — real content is Phase 1 (docs/07-implementation-plan.md Phase 1,
 * docs/10-hobby-scope.md §7 "H1 · Knowledge base"):
 *   - YAML entry schema + Zod validator (docs/04-knowledge-base.md §1)
 *   - build.ts emitting kb.json + kb.index.json (gzipped, SHA-256, version-stamped)
 *   - 60–80 authored entries, en + es, ≥2 sources each, dog and cat authored separately
 *   - the signs/emergency_actions controlled vocabulary
 *   - resolveVerdict(kbId, species) — lives in packages/shared per AGENTS.md #5, reads this
 *     package's build output
 *
 * This file exists only so the workspace package resolves and `pnpm -r typecheck` has
 * something to check.
 */
export const KB_PACKAGE_PLACEHOLDER = true;
