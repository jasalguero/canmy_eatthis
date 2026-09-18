// Namespace list from docs/07-implementation-plan.md Phase 0. Kept as an explicit array
// (rather than a directory scan) so adding a namespace is a one-line, reviewable change.
export const NAMESPACES = ['common', 'home', 'result', 'errors', 'onboarding', 'legal'] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
