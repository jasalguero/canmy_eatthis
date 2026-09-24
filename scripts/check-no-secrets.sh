#!/usr/bin/env bash
# AGENTS.md #6 / docs/07 Phase 5 acceptance: no API key in any committed file. The Worker's one
# secret lives only in `wrangler secret`; the nightly eval's only in GitHub Actions secrets.
# Matches the key formats of the providers this project uses or has considered.
set -u

PATTERNS='AIza[0-9A-Za-z_-]{35}|sk-(proj-)?[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|GEMINI_API_KEY *= *"?[A-Za-z0-9_-]{20,}'

if hits=$(git ls-files -z | xargs -0 grep -nIE "$PATTERNS" -- 2>/dev/null); then
  echo "$hits"
  echo ""
  echo "FAIL: something that looks like an API key is committed (AGENTS.md #6)."
  echo "Rotate it, remove it, and set it with 'wrangler secret put' instead."
  exit 1
fi
echo "No API keys found in tracked files."
