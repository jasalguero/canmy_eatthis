/**
 * The Bold Ink mascot palette (docs/02-tech-decisions.md D25): fill colours for the dog and cat
 * illustrations `components/feedback/Mascot.tsx` draws.
 *
 * Theme-invariant, like `camera` in `tokens.ts` and for the same reason: this is illustration
 * ink, not chrome. The mascots keep the same fur/outline colours in light and dark mode — only
 * the surface they sit on changes — which is what makes them read as a drawn character rather
 * than a themed UI control. Living under `theme/` keeps these literals where AGENTS.md #7 allows
 * them; `Mascot.tsx` itself imports the values from here rather than writing hex codes.
 */

export type MascotSpecies = 'dog' | 'cat';

/**
 * A mood the mascot can render. `idle`/`happy`/`sniff` are calm-to-pleased; `worried` and
 * `confused` are the ones the safety copy actually leans on:
 *   - `worried` backs a `toxic` verdict and the Identifying screen — never `happy` there, so an
 *     unhappy result never looks like it is celebrating (AGENTS.md #2 in spirit: nothing about a
 *     bad answer should read as reassuring).
 *   - `confused` backs `unknown` — a shrug, not a smile.
 *   - `cautious` backs `caution`.
 */
export type MascotMood = 'idle' | 'happy' | 'worried' | 'confused' | 'cautious' | 'sniff';

export interface MascotPalette {
  fur: string;
  /** The paws — usually the fur colour, but a cat can have white mittens. */
  paw: string;
  patch: string;
  muzzle: string;
  blush: string;
  collar: string;
  tag: string;
}

/** The ink outline and its two thinner weights — one value per stroke weight, not per species. */
export const MASCOT_INK = '#22170F';

/** The eye highlight and the worried-sweat-drop fill — the two mascot colours that are not part
 *  of either species' palette. Named here, not inline in `Mascot.tsx`, so AGENTS.md #7 still
 *  holds: every colour literal lives under `theme/`. */
export const MASCOT_EYE_HIGHLIGHT = '#FFFFFF';
export const MASCOT_SWEAT = '#8FD3FF';

export const MASCOT_PALETTE: Record<MascotSpecies, MascotPalette> = {
  dog: {
    fur: '#F4B76B',
    paw: '#F4B76B',
    patch: '#E39A52',
    muzzle: '#FFF6E6',
    blush: '#FF8F80',
    collar: '#3E9BFF',
    tag: '#FFD84D',
  },
  cat: {
    fur: '#34343C',
    paw: '#34343C',
    patch: '#52525E',
    muzzle: '#EEF2F8',
    blush: '#FF8F80',
    collar: '#9B7BFF',
    tag: '#FFD84D',
  },
};

/** The mood every verdict renders the mascot in — the one place safety and art meet. */
export const VERDICT_MASCOT_MOOD = {
  safe: 'happy',
  caution: 'cautious',
  toxic: 'worried',
  unknown: 'confused',
} as const satisfies Record<string, MascotMood>;

/** The scanning screen's magnifier (the canvas's A3) — illustration ink, like the mascot, so
 *  theme-invariant: a yellow handle, a clear lens with a white glint. */
export const MAGNIFIER_COLORS = {
  handle: '#FFC23D',
  lens: '#FFFFFF',
  glint: '#FFFFFF',
} as const;
