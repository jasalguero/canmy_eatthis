# apps/mobile

Expo SDK 57 / RN 0.86, New Architecture, expo-router, TypeScript `strict: true`.

Through Phase 3 (`docs/07-implementation-plan.md`): the full design system on real screens,
camera/library/barcode capture with the resize+EXIF-strip image pipeline, offline text resolution
(exact, alias and fuzzy match) against the bundled knowledge base, and barcode lookups against Open
Food Facts (D29) — a typed check works end to end with zero network. Photo *identification* is
switched off by default (`EXPO_PUBLIC_FEATURE_PHOTO_ID`, D28) until its second-release integration
is built.

```
corepack enable
pnpm install
pnpm --filter @canmyeatthis/mobile start
```

`assets/*.png` are solid-colour placeholders, not real icons/splash art.
