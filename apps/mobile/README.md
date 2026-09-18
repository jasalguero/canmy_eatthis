# apps/mobile

Expo SDK 57 / RN 0.86, New Architecture, expo-router, TypeScript `strict: true`.

Phase 0 scaffold only — one placeholder screen (`src/app/index.tsx`) that proves the app boots,
i18n resolves (en/es + a dev-only pseudo-locale), and settings persist. Phase 2
(`docs/07-implementation-plan.md`) replaces the screen with the real design system.

This repo's sandbox had no package-registry network access while this scaffold was authored, so
`node_modules` has never been installed here — see the repo root README section this phase's
handoff notes added, or just run:

```
corepack enable
pnpm install
pnpm --filter @canmyeatthis/mobile start
```

`assets/*.png` are solid-colour placeholders, not real icons/splash art.
