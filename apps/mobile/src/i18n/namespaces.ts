// Namespace list from docs/07-implementation-plan.md Phase 0, extended in Phase 2 as screens
// were built. Kept as an explicit array (rather than a directory scan) so adding a namespace is
// a one-line, reviewable change.
//
// `vocab` is different from the rest: it is not authored in `locales/`, it is the controlled
// vocabulary imported from `packages/kb/vocab` (AGENTS.md #13 — translated exactly once). See
// `./vocab.ts`.
export const NAMESPACES = [
  'common',
  'home',
  'identify',
  'confirm',
  'result',
  'errors',
  'onboarding',
  'legal',
  'history',
  'profile',
  'settings',
  'vocab',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** The namespaces authored as JSON under `locales/<lang>/`. `vocab` is imported, not authored. */
export const AUTHORED_NAMESPACES = NAMESPACES.filter((ns) => ns !== 'vocab');

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
