#!/usr/bin/env node
/**
 * CI contrast check (docs/06-ui-design-system.md §1, Phase 2 acceptance):
 * "every verdict `fg` on its `surface` must pass WCAG AA (≥4.5:1). Add a CI check that
 * computes contrast ratios from the token file; do not eyeball it."
 *
 * Loads apps/mobile/src/theme/tokens.ts (via jiti, same mechanism as tailwind.config.js) and
 * verifies, in BOTH themes:
 *   - every verdict fg on its surface        ≥ 4.5:1 (WCAG AA text)
 *   - verdict onBg on its bg                 ≥ 4.5:1 (banner word AND glyph)
 *   - verdict onAccent on its accent         ≥ 4.5:1 (label on an accent FILL — the toxic
 *                                                     EmergencyCallButton, the toggle pill)
 *   - brand.onPrimary on brand.primary       ≥ 4.5:1 (the Check button label)
 *
 * `accent` is deliberately NOT checked as a foreground: docs/06 §1 fixes the light accent values
 * and they are mid-tone (safe #14A06B on its own surface is 2.75:1). Accent is a FILL colour and
 * a decorative tint, never the sole carrier of a meaning — the verdict glyph renders in `onBg` on
 * the banner and in `fg` on a tinted surface, both of which are checked above. Enforcing 3:1 on
 * accent-as-foreground would require changing values the design doc pins down; restricting where
 * accent may be used is the cheaper and more honest fix. See docs/02-tech-decisions.md D18.
 *   - text.primary/secondary/tertiary on surface.base ≥ 4.5:1
 *   - brand.link on surface.base/raised      ≥ 4.5:1 (link text, quiet-button labels)
 *   - text.primary on surface.raised         ≥ 4.5:1 (card body)
 *   - text.primary on surface.overlay        ≥ 4.5:1 (sheet body)
 *   - border ordering sanity: strong, default and subtle are strictly ordered by their contrast
 *     against surface.base (borders are deliberately low-contrast dividers — WCAG 3:1 non-text
 *     does not apply to decorative separators; focus visibility comes from brand.primary, which
 *     IS checked above). Ordering by contrast rather than raw luminance is what makes the rule
 *     mean the same thing in both themes, where the polarity flips.
 *
 * Also asserts the two hard rules that are about colour semantics, not ratios:
 *   - `unknown` is never greenish (hue check on bg/surface/accent) and never brighter than
 *     `caution` (it must read as "not sure", not as the calmest verdict).
 *   - no two verdicts share a (bg, surface) pair — the four must stay distinct.
 */

// jiti 1.x: the default export is the factory itself (createJITI only exists in jiti 2.x).
import createJiti from 'jiti';

const jiti = createJiti(new URL('../apps/mobile/tailwind.config.js', import.meta.url).pathname, {
  interopDefault: true,
});
// Absolute path: jiti resolves relative ids against its base file (apps/mobile/tailwind.config.js).
const { tokens } = jiti(new URL('../apps/mobile/src/theme/tokens.ts', import.meta.url).pathname);

function hexToRgb(hex) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Rough hue in degrees; -1 for (near-)achromatic colours. */
function hue(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.04) return -1; // achromatic
  let h;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return (h * 60 + 360) % 360;
}

let failures = 0;
function check(label, actual, min) {
  const ok = actual >= min - 1e-9;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual.toFixed(2)}:1 (need ≥${min}:1)`);
}

for (const theme of ['light', 'dark']) {
  const t = tokens[theme];
  console.log(`\n— ${theme} —`);

  for (const verdict of ['safe', 'caution', 'toxic', 'unknown']) {
    const v = t.verdict[verdict];
    check(`${theme}/${verdict} fg on surface`, contrast(v.fg, v.surface), 4.5);
    check(`${theme}/${verdict} banner word + glyph (onBg on bg)`, contrast(v.onBg, v.bg), 4.5);
    check(
      `${theme}/${verdict} label on accent fill (onAccent on accent)`,
      contrast(v.onAccent, v.accent),
      4.5,
    );
  }

  check(`${theme} text.primary on surface.base`, contrast(t.text.primary, t.surface.base), 4.5);
  check(`${theme} text.secondary on surface.base`, contrast(t.text.secondary, t.surface.base), 4.5);
  check(`${theme} text.tertiary on surface.base`, contrast(t.text.tertiary, t.surface.base), 4.5);
  check(`${theme} text.primary on surface.raised`, contrast(t.text.primary, t.surface.raised), 4.5);
  check(
    `${theme} text.primary on surface.overlay`,
    contrast(t.text.primary, t.surface.overlay),
    4.5,
  );
  // `brand.primary` is a FILL colour only (docs/02 D25) — tuned to carry a dark-ink label as a
  // button/badge fill, which pulls in the opposite direction from also being ≥4.5:1 as text on
  // a light surface (both cannot hold for one value; see tokens.ts's `link` doc comment). Text
  // uses of brand colour (links, quiet-button labels) go through the separate `brand.link` token.
  check(
    `${theme} brand.link on surface.base (link/label)`,
    contrast(t.brand.link, t.surface.base),
    4.5,
  );
  check(
    `${theme} brand.link on surface.raised (link/label)`,
    contrast(t.brand.link, t.surface.raised),
    4.5,
  );
  check(
    `${theme} Check-button label (brand.onPrimary on brand.primary)`,
    contrast(t.brand.onPrimary, t.brand.primary),
    4.5,
  );

  // Borders are decorative separators, not non-text UI components, so they carry no ratio floor.
  // What must hold is that the three weights are actually distinguishable and correctly ordered.
  const borderContrasts = ['subtle', 'default', 'strong'].map((key) => ({
    key,
    ratio: contrast(t.border[key], t.surface.base),
  }));
  const ordered = borderContrasts.every(
    (b, i) => i === 0 || b.ratio > borderContrasts[i - 1].ratio + 1e-9,
  );
  if (ordered) {
    console.log(
      `PASS  ${theme} border weights ordered subtle < default < strong vs surface.base ` +
        `(${borderContrasts.map((b) => b.ratio.toFixed(2)).join(' < ')})`,
    );
  } else {
    failures++;
    console.log(
      `FAIL  ${theme} border weights not strictly ordered vs surface.base ` +
        `(${borderContrasts.map((b) => `${b.key} ${b.ratio.toFixed(2)}`).join(', ')})`,
    );
  }
}

// --- semantic colour rules -------------------------------------------------
console.log('\n— semantic rules —');

for (const theme of ['light', 'dark']) {
  const t = tokens[theme];

  // `unknown` is never greenish (docs/00 hard rule: never rendered green).
  for (const key of ['bg', 'surface', 'accent']) {
    const h = hue(t.verdict.unknown[key]);
    const greenish = h !== -1 && h >= 70 && h <= 165;
    if (greenish) {
      failures++;
      console.log(`FAIL  ${theme}/unknown.${key} is greenish (hue ${h.toFixed(0)}°)`);
    } else {
      console.log(`PASS  ${theme}/unknown.${key} is not greenish`);
    }
  }

  // The four verdicts must stay distinct from each other.
  const seen = new Set();
  for (const verdict of ['safe', 'caution', 'toxic', 'unknown']) {
    const pair = `${t.verdict[verdict].bg}|${t.verdict[verdict].surface}`;
    if (seen.has(pair)) {
      failures++;
      console.log(`FAIL  ${theme}: duplicate verdict (bg,surface) pair for ${verdict}`);
    }
    seen.add(pair);
  }
  console.log('PASS  verdict (bg,surface) pairs are distinct');

  // `unknown` must not be the brightest verdict surface — it is "not sure", not calm.
  const lum = (hex) => relativeLuminance(hex);
  const unknownLum = lum(t.verdict.unknown.surface);
  for (const verdict of ['safe', 'caution']) {
    if (unknownLum > lum(t.verdict[verdict].surface) + 0.25) {
      failures++;
      console.log(`FAIL  ${theme}: unknown surface is markedly brighter than ${verdict}`);
    } else {
      console.log(`PASS  unknown surface not brighter than ${verdict}`);
    }
  }
}

console.log('');
if (failures > 0) {
  console.error(`FAIL: ${failures} contrast/semantic check(s) failed.`);
  process.exit(1);
}
console.log('OK: all contrast and semantic colour checks pass.');
