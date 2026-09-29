import type { ResolvedKbEntry } from './schemas/resolved-kb-entry.js';
import type { Species } from './schemas/species.js';
import { type VerdictPayload, VerdictPayloadSchema } from './schemas/verdict.js';

/**
 * Turns a KB entry (already loaded and resolved to one language — see
 * `ResolvedKbEntrySchema`) plus a species into the `VerdictPayload` the app renders.
 *
 * Pure and synchronous: no I/O, no network, no randomness. AGENTS.md #5 — this is the only
 * place resolution logic lives, so the app (on-device, offline) and the Worker (server-side)
 * compute byte-identical verdicts for the same `(kbId, species)` by both calling this function
 * against the same KB artefact. D16 drops the original
 * plan's `context` parameter (`petWeightKg`, `amount`) — there is no risk band left to compute
 * from it.
 *
 * `VerdictPayloadSchema.parse` re-validates the constructed payload against all of its runtime
 * invariants (`docs/03-api-contract.md` §VerdictPayload) before returning it, rather than
 * trusting that the KB build already enforced them — a payload that violates an invariant
 * throws here instead of reaching a screen.
 */
export function resolveVerdict(params: {
  entry: ResolvedKbEntry;
  species: Species;
  kbVersion: string;
  disclaimer: string;
}): VerdictPayload {
  const { entry, species, kbVersion, disclaimer } = params;
  const speciesEntry = entry.species[species];

  return VerdictPayloadSchema.parse({
    kbId: entry.id,
    displayName: entry.displayName,
    species,
    verdict: speciesEntry.verdict,
    severity: speciesEntry.severity,
    headline: speciesEntry.headline,
    summary: speciesEntry.summary,
    signs: speciesEntry.signs,
    onsetHours: speciesEntry.onset_hours,
    emergencyActions: speciesEntry.emergency_actions,
    sources: entry.sources.map((s) => ({ label: s.label, url: s.url })),
    kbVersion,
    disclaimer,
  });
}
