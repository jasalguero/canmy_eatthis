#!/usr/bin/env bash
# Phase 2 CI checks (docs/07-implementation-plan.md Phase 2 acceptance, docs/06 §1–§2).
#
# Two greps the design system depends on and which no type can express:
#
#   1. AGENTS.md #7 — no colour literals outside `apps/mobile/src/theme/`. Every colour comes
#      from the token file, so a `#RRGGBB` anywhere else is a value that cannot change between
#      light and dark and that the contrast check cannot see.
#   2. docs/06 §2 — logical layout properties only (`marginStart`/`paddingEnd`/`insetInlineStart`),
#      never `marginLeft`/`right:`. This is what keeps the layout correct if an RTL language is
#      ever added, and it is cheaper to hold from the start than to retrofit.
set -u

SRC="apps/mobile/src"
fail=0

echo "Checking for colour literals outside theme/ (AGENTS.md #7)..."
# `theme/` is the one place literals are allowed — it *is* the token definition.
if hits=$(grep -rnE '#[0-9a-fA-F]{6}\b' "$SRC" --include='*.tsx' --include='*.ts' \
  | grep -v "^$SRC/theme/" || true); then
  if [ -n "$hits" ]; then
    echo "$hits"
    echo "  → move the value into src/theme/tokens.ts and reference it by class name."
    fail=1
  fi
fi

echo "Checking for Tailwind default-palette classes..."
# The palette is removed in tailwind.config.js, so these silently resolve to nothing rather than
# erroring — which makes them worth catching here.
if hits=$(grep -rnE '\b(bg|text|border)-(red|green|blue|gray|grey|slate|zinc|amber|yellow|orange|emerald|teal|cyan|indigo|violet|purple|pink|rose|stone|neutral|lime|sky|fuchsia)-[0-9]{2,3}\b' \
  "$SRC" --include='*.tsx' --include='*.ts' || true); then
  if [ -n "$hits" ]; then
    echo "$hits"
    echo "  → use a token class (bg-surface-base, text-ink-primary, bg-verdict-toxic-bg, ...)."
    fail=1
  fi
fi

echo "Checking for physical layout properties (docs/06 §2)..."
# Style-object properties and Tailwind class forms. `insetInlineStart`/`insetInlineEnd` are the
# logical replacements for `left`/`right` and are deliberately not matched.
if hits=$(grep -rnE '\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\b' \
  "$SRC" --include='*.tsx' --include='*.ts' || true); then
  if [ -n "$hits" ]; then
    echo "$hits"
    echo "  → use the logical form: marginStart/marginEnd, paddingStart/paddingEnd, borderStart*."
    fail=1
  fi
fi

# `left:`/`right:` as style-object keys. Matches `left: 4` and `left:4`, not `insetInlineStart`.
if hits=$(grep -rnE '(^|[^a-zA-Z])(left|right)\s*:' "$SRC" --include='*.tsx' --include='*.ts' || true); then
  if [ -n "$hits" ]; then
    echo "$hits"
    echo "  → use insetInlineStart / insetInlineEnd."
    fail=1
  fi
fi

echo "Checking that mock data is imported only by the gallery and lib/devPreview.ts..."
# Mock data must never reach a release build. Only the gallery and lib/devPreview.ts (whose every
# function returns nothing outside a development build) may import mock/; any other screen that
# needs a fixed state goes through devPreview. Tests and mock/ itself are exempt.
if hits=$(grep -rnE "from ['\"](@/mock|(\.\.?/)+mock)/" "$SRC" --include='*.tsx' --include='*.ts' \
  | grep -v "^$SRC/mock/" \
  | grep -v "^$SRC/app/gallery.tsx:" \
  | grep -v "^$SRC/lib/devPreview.ts:" \
  | grep -vE "\.test\.tsx?:" || true); then
  if [ -n "$hits" ]; then
    echo "$hits"
    echo "  → get the fixed state from src/lib/devPreview.ts instead."
    fail=1
  fi
fi

echo "Checking every legal page the app links to exists in site/..."
# apps/mobile/src/lib/legal.ts opens site/<language>/<page>.html; a missing file is a dead link
# from the app, and a missing privacy policy is a store rejection.
for lang in en es; do
  for page in privacy terms; do
    if [ ! -f "site/$lang/$page.html" ]; then
      echo "  missing: site/$lang/$page.html"
      fail=1
    fi
  done
done

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "FAIL: UI hygiene check failed."
  exit 1
fi

echo "OK: no colour literals outside theme/, no default-palette classes, no physical layout properties, no mock imports outside the gallery."
