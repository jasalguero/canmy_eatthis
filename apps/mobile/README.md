# apps/mobile

Expo SDK 57 / RN 0.86, New Architecture, expo-router, TypeScript `strict: true`.

Through H3 (`docs/10-hobby-scope.md` §7): the full design system on real screens, camera/library/
barcode capture with the resize+EXIF-strip image pipeline, and offline text resolution (exact,
alias and fuzzy match) against the bundled knowledge base — a typed check works end to end with
zero network. Photo *identification* still needs the Worker (H4), so a captured photo still hands
off to Confirm's placeholder candidates until then.

```
corepack enable
pnpm install
pnpm --filter @canmyeatthis/mobile start
```

`assets/*.png` are solid-colour placeholders, not real icons/splash art.
