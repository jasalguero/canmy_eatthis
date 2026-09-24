import type { Verdict } from '@canmyeatthis/shared';

/**
 * Verdict → concrete Tailwind class names and non-colour signals.
 *
 * This lives in `theme/` for two reasons. First, AGENTS.md #7: colour decisions belong here and
 * nowhere else. Second, Tailwind class names cannot be built at runtime — `bg-verdict-${v}-bg`
 * is not a class the compiler ever sees — so the mapping has to be a static lookup table
 * somewhere, and a component is the wrong somewhere.
 *
 * `accent` is a FILL only, never a foreground (docs/02-tech-decisions.md D18) — which is why
 * there is `onAccentText` to pair with `accentFill`, and why the glyph uses `onBgText`/`fgText`.
 */

export type VerdictClasses = {
  /** Full-bleed banner background. */
  bannerBg: string;
  /** Text and glyph on `bannerBg`. CI-checked ≥4.5:1. */
  onBgText: string;
  /** Tinted card/chip background. */
  surfaceBg: string;
  /** Text and glyph on `surfaceBg`. CI-checked ≥4.5:1. */
  fgText: string;
  /** Accent as a fill (emergency call button, progress). Never a text colour. */
  accentFill: string;
  /** Text on `accentFill`. CI-checked ≥4.5:1. */
  onAccentText: string;
  /** Accent as a border — decorative emphasis on a tinted surface. */
  accentBorder: string;
};

export const VERDICT_CLASSES: Record<Verdict, VerdictClasses> = {
  safe: {
    bannerBg: 'bg-verdict-safe-bg',
    onBgText: 'text-verdict-safe-on-bg',
    surfaceBg: 'bg-verdict-safe-surface',
    fgText: 'text-verdict-safe-fg',
    accentFill: 'bg-verdict-safe-accent',
    onAccentText: 'text-verdict-safe-on-accent',
    accentBorder: 'border-verdict-safe-accent',
  },
  caution: {
    bannerBg: 'bg-verdict-caution-bg',
    onBgText: 'text-verdict-caution-on-bg',
    surfaceBg: 'bg-verdict-caution-surface',
    fgText: 'text-verdict-caution-fg',
    accentFill: 'bg-verdict-caution-accent',
    onAccentText: 'text-verdict-caution-on-accent',
    accentBorder: 'border-verdict-caution-accent',
  },
  toxic: {
    bannerBg: 'bg-verdict-toxic-bg',
    onBgText: 'text-verdict-toxic-on-bg',
    surfaceBg: 'bg-verdict-toxic-surface',
    fgText: 'text-verdict-toxic-fg',
    accentFill: 'bg-verdict-toxic-accent',
    onAccentText: 'text-verdict-toxic-on-accent',
    accentBorder: 'border-verdict-toxic-accent',
  },
  unknown: {
    bannerBg: 'bg-verdict-unknown-bg',
    onBgText: 'text-verdict-unknown-on-bg',
    surfaceBg: 'bg-verdict-unknown-surface',
    fgText: 'text-verdict-unknown-fg',
    accentFill: 'bg-verdict-unknown-accent',
    onAccentText: 'text-verdict-unknown-on-accent',
    accentBorder: 'border-verdict-unknown-accent',
  },
};

/**
 * The non-colour signal (docs/06 §1: "Colour is never the only signal"). Roughly 8% of men have
 * some colour-vision deficiency and red/green is the exact axis this app depends on, so every
 * verdict also carries a distinct glyph — and, in the UI, a distinct word.
 *
 * These are text glyphs rather than icons so they inherit the font scale: at 200% the glyph
 * grows with everything around it instead of staying 64pt while the word wraps past it.
 *
 * `toxic`'s `⚠` carries `U+FE0E` (VARIATION SELECTOR-15, "render as text") — found on a real iOS
 * Simulator pass (docs/02-tech-decisions.md D25 addendum): without it, `⚠` (U+26A0) gets Apple's
 * default *colour emoji* presentation — a yellow triangle, not the ink-coloured glyph this design
 * system uses everywhere else. `U+FE0E` is the standard Unicode mechanism for exactly this
 * (`⚠` is listed in Unicode's emoji-variation-sequences.txt as supporting both presentations),
 * and every platform this app ships on honours it. The other three glyphs were checked against
 * the same emoji-default-presentation list and don't need it: `!`/`?` are plain ASCII, and `✓`
 * (U+2713) is a different, text-only codepoint from the emoji-default `✅` (U+2705).
 */
export const VERDICT_GLYPH: Record<Verdict, string> = {
  safe: '✓',
  caution: '!',
  toxic: '⚠︎',
  unknown: '?',
};

/** i18n key for the verdict's word. Underscored: see the note in `scripts/check-safe-claims.sh` —
 *  the catalogue may not contain the bare word as a key either, and `verdictWord_…` avoids a
 *  word boundary before it. */
export function verdictWordKey(verdict: Verdict): string {
  return `result:verdictWord_${verdict}`;
}
