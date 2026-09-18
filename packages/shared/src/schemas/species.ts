import { z } from 'zod';

/**
 * The only two species this app supports. Adding a third is a product decision,
 * not a schema tweak — the entire KB is authored per-species (AGENTS.md #8).
 */
export const SpeciesSchema = z.enum(['dog', 'cat']);
export type Species = z.infer<typeof SpeciesSchema>;
