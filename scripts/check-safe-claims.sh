#!/usr/bin/env bash
# AGENTS.md #3: the word "safe" is never used as a bare claim in any user-facing string.
# Use "no known toxicity" / "generally well tolerated" instead (docs/05-safety-legal.md §1.2,
# docs/00-product-spec.md verdict copy rules).
#
# User-facing strings live in exactly two places (AGENTS.md #11 forbids literals in
# components, so everything else goes through t() or the KB):
#   1. apps/mobile/src/i18n/locales/** — zero tolerance for the word "safe" at all: even a
#      negated use is copy we should not be writing (the verdict label renders as "No known
#      risk", never "Safe").
#   2. packages/kb/data/*.yaml — headlines and summaries are rendered verbatim, so bare
#      *claims* ("is safe", "safe to eat", ...) fail the build. Negated, sourced statements
#      ("No amount is known to be reliably safe") are honest and allowed — that is why this
#      check matches claim patterns, not the bare word.
set -u

fail=0

echo "Checking i18n catalogues for the word 'safe' (zero tolerance)..."
if hits=$(grep -rniE '\bsafe\b' apps/mobile/src/i18n/locales/ 2>/dev/null); then
  echo "$hits"
  fail=1
fi

echo "Checking KB entries for bare 'safe' claims..."
# Claim patterns, case-insensitive. Deliberately does NOT match negated uses such as
# "no amount is known to be reliably safe" (grapes/raisins) — those are the honest copy.
CLAIM_PATTERNS='is safe|are safe|it'"'"'s safe|its safe|safe to eat|completely safe|totally safe|perfectly safe|100% safe|es seguro|está seguro|está segura|seguro para|segura para'
if hits=$(grep -rniE "$CLAIM_PATTERNS" packages/kb/data/ 2>/dev/null); then
  echo "$hits"
  fail=1
fi

echo "Checking the published legal pages (site/) for the word 'safe' (zero tolerance)..."
# The privacy policy and terms are user-facing too, and the app links to them.
if hits=$(grep -rniE '\bsafe\b' site/ 2>/dev/null); then
  echo "$hits"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "FAIL: bare 'safe' claim found in user-facing strings (AGENTS.md #3)."
  echo "Use 'no known toxicity' / 'generally well tolerated' instead."
  exit 1
fi

echo "OK: no bare 'safe' claims in user-facing strings."
