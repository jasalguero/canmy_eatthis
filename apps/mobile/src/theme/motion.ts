import type { Verdict } from '@canmyeatthis/shared';

/**
 * Bold Ink's motion vocabulary (docs/02-tech-decisions.md D26), ported keyframe-for-keyframe from
 * the design canvas's `@keyframes a-*` rules (row A, "Bold Ink — loud, bouncy, outlined").
 *
 * Pure data, no React Native import: `components/primitives/Motion.tsx` turns a spec into an
 * `Animated` interpolation, and `motion.test.ts` checks the safety properties below without
 * rendering anything.
 *
 * Every length is in design pixels (points), or — where a key ends in `Fraction` — a fraction of
 * a `distance` the caller measures (the banner's drop, the scan band's travel). Rotations are
 * degrees. `at` is the keyframe offsets, 0→1, and every channel lists one value per offset.
 */

export type MotionEasing = 'linear' | 'in' | 'out' | 'inOut' | 'firm' | 'overshoot';

/** The canvas's two named curves, plus CSS's own `ease-*` keywords, as cubic-bezier points. */
export const EASING_BEZIER: Record<
  Exclude<MotionEasing, 'linear'>,
  readonly [number, number, number, number]
> = {
  in: [0.42, 0, 1, 1],
  out: [0, 0, 0.58, 1],
  inOut: [0.42, 0, 0.58, 1],
  /** `cubic-bezier(.2,.8,.2,1)` — lands without bouncing. The toxic path's curve. */
  firm: [0.2, 0.8, 0.2, 1],
  /** `cubic-bezier(.34,1.56,.64,1)` — overshoots and settles. Only ever on a transition. */
  overshoot: [0.34, 1.56, 0.64, 1],
};

export interface KeyframeChannels {
  opacity?: readonly number[];
  translateX?: readonly number[];
  translateY?: readonly number[];
  translateYFraction?: readonly number[];
  scale?: readonly number[];
  scaleX?: readonly number[];
  scaleY?: readonly number[];
  rotate?: readonly number[];
}

export interface Keyframes extends KeyframeChannels {
  duration: number;
  easing: MotionEasing;
  at: readonly number[];
}

/**
 * One-shot entrances. Each one's LAST frame is the element's ordinary, fully visible layout —
 * `motion.test.ts` asserts it for every entry, because `Enter` also snaps to that frame when the
 * animation is skipped, stopped or never reaches the device (the D23 failure).
 */
export const ENTRANCES = {
  /** `a-rise`: content lifting in under the banner. */
  rise: { duration: 480, easing: 'firm', at: [0, 1], opacity: [0, 1], translateY: [14, 0] },
  /** `a-fade` (`.m-in`): the toxic banner's mascot — present, not performing. */
  fade: { duration: 500, easing: 'out', at: [0, 1], opacity: [0, 1] },
  /** `a-thud`: the toxic glyph badge. Lands, no bounce. */
  thud: { duration: 300, easing: 'firm', at: [0, 1], scale: [1.35, 1], opacity: [0, 1] },
  /** `a-pop`: the no-known-toxicity glyph badge, and the splash coin. */
  pop: {
    duration: 620,
    easing: 'out',
    at: [0, 0.68, 1],
    scale: [0, 1.2, 1],
    rotate: [-24, 8, 0],
  },
  /** `a-mpop` (`.m-pop`): the mascot jumping in, squash-and-stretch. */
  mpop: {
    duration: 700,
    easing: 'out',
    at: [0, 0.55, 0.78, 1],
    opacity: [0, 1, 1, 1],
    translateY: [50, -8, 2, 0],
    scaleX: [0.7, 1.07, 0.98, 1],
    scaleY: [1.25, 0.93, 1.02, 1],
  },
  /** `a-drop`: the banner dropping in from above and bouncing. */
  drop: {
    duration: 720,
    easing: 'out',
    at: [0, 0.62, 0.82, 1],
    translateYFraction: [-1.05, 0.03, -0.01, 0],
  },
  /** `a-drop-firm`: the same banner, for a verdict that must not look playful. */
  dropFirm: {
    duration: 320,
    easing: 'firm',
    at: [0, 1],
    translateYFraction: [-0.4, 0],
    opacity: [0, 1],
  },
  /** A scanning stage's check badge popping in (`a-st-done*`'s 20%→26% segment, 8s cycle). */
  check: {
    duration: 480,
    easing: 'linear',
    at: [0, 0.5, 1],
    scale: [0.2, 1.25, 1],
    opacity: [0, 1, 1],
  },
} as const satisfies Record<string, Keyframes>;

export type EntranceKind = keyof typeof ENTRANCES;

/**
 * Loops. `Loop` renders its child with NO animated style at all when motion is off, so a loop's
 * frame 0 does not have to be a rest frame (a sparkle's frame 0 is invisible).
 */
export const LOOPS = {
  /** `a-bob`: the mascot head and the camera badge breathing. */
  bob: { duration: 2600, easing: 'inOut', at: [0, 0.5, 1], translateY: [0, -3, 0] },
  /** `a-ear`: the dog's ears swaying. */
  ear: { duration: 2600, easing: 'inOut', at: [0, 0.5, 1], rotate: [0, 5, 0] },
  /** `a-twitch`: the cat's ears, mostly still, then a flick. */
  twitch: {
    duration: 5200,
    easing: 'linear',
    at: [0, 0.84, 0.88, 0.92, 0.95, 1],
    rotate: [0, 0, -9, 5, 0, 0],
  },
  /** `a-sniff`: the nose, while the mascot examines the photo. */
  sniff: {
    duration: 550,
    easing: 'inOut',
    at: [0, 0.35, 0.65, 1],
    scaleX: [1, 1.14, 1, 1],
    scaleY: [1, 0.88, 1, 1],
  },
  /** `a-puff`: sniff puffs drifting off. */
  puff: {
    duration: 1100,
    easing: 'out',
    at: [0, 0.3, 1],
    opacity: [0, 1, 0],
    translateX: [0, -5.4, -18],
    translateY: [0, -4.2, -14],
    scale: [0.4, 0.63, 1.15],
  },
  /** `a-wobble`: the confused mascot's "?". */
  wobble: { duration: 1800, easing: 'inOut', at: [0, 0.5, 1], rotate: [-8, 8, -8] },
  /** `a-ring`: the call button's handset, a burst of shakes then a rest. */
  ring: {
    duration: 2600,
    easing: 'linear',
    at: [0, 0.62, 0.66, 0.7, 0.74, 0.78, 0.82, 0.86, 1],
    rotate: [0, 0, -18, 16, -13, 9, -5, 0, 0],
  },
  /** `a-twinkle`: the sparkles around a no-known-toxicity mascot. */
  twinkle: {
    duration: 1800,
    easing: 'inOut',
    at: [0, 0.5, 1],
    opacity: [0, 1, 0],
    scale: [0.3, 1, 0.3],
    rotate: [0, 90, 0],
  },
  /** `a-dots`: the "working on it" dots in the active scanning stage. */
  dots: {
    duration: 900,
    easing: 'inOut',
    at: [0, 0.4, 0.8, 1],
    translateY: [0, -5, 0, 0],
    opacity: [0.45, 1, 0.45, 0.45],
  },
} as const satisfies Record<string, Keyframes>;

export type LoopKind = keyof typeof LOOPS;

/** `a-sweat`: the worried sweat drop sliding down once, 0.9s in, and staying. */
export const SWEAT: Keyframes = {
  duration: 1400,
  easing: 'in',
  at: [0, 0.4, 1],
  opacity: [0, 1, 1],
  translateY: [-8, -2.8, 5],
};
export const SWEAT_DELAY = 900;

/** `a-blink`: eyes shut for ~150ms (the 91%→100% segment) every 4.2s. */
export const BLINK = { period: 4200, closed: 150 } as const;

/** `a-scan`: the band sweeping the photo, 2.2s each way. Band height is the design's 36px. */
export const SCAN = { duration: 2200, bandHeight: 36 } as const;

/**
 * `a-mag`: the magnifier wandering the photo. Positions are for the canvas's 350×244 photo and
 * are scaled to the real one by the caller.
 */
export const MAGNIFIER: Keyframes & {
  translateX: readonly number[];
  translateY: readonly number[];
  frameWidth: number;
  frameHeight: number;
  size: number;
} = {
  duration: 6400,
  easing: 'inOut',
  at: [0, 0.25, 0.5, 0.75, 1],
  translateX: [34, 198, 214, 70, 34],
  translateY: [30, 16, 124, 132, 30],
  rotate: [-8, 6, -4, 8, -8],
  frameWidth: 350,
  frameHeight: 244,
  size: 86,
};

/** The coin flip between dog and cat (`.coin-in`'s `transition: transform 700ms`). */
export const COIN_FLIP = { duration: 700, easing: 'overshoot' } as const;

/**
 * How a verdict arrives (the canvas's A4 vs. A5 artboards).
 *
 * Only `safe` gets the bouncy, celebratory version. `toxic` is the "2 a.m." artboard: the banner
 * lands firmly, the badge thuds, the mascot fades in without jumping, and nothing below the banner
 * waits on an animation. `caution` and `unknown` take the firm path too — the canvas doesn't draw
 * them, and AGENTS.md #2 rules out anything about `unknown` reading as good news, so they inherit
 * the conservative choice rather than the playful one.
 */
export interface VerdictMotion {
  banner: EntranceKind;
  badge: EntranceKind;
  badgeDelay: number;
  mascot: EntranceKind;
  mascotDelay: number;
  /** Whether the banner text and the content below rise in, staggered. */
  stagger: boolean;
  /** Whether the mascot idles (bob, ears) — `.calm` on the toxic artboard switches this off. */
  mascotIdle: boolean;
  sparkles: boolean;
}

const FIRM: Omit<VerdictMotion, 'mascotIdle'> = {
  banner: 'dropFirm',
  badge: 'thud',
  badgeDelay: 200,
  mascot: 'fade',
  mascotDelay: 300,
  stagger: false,
  sparkles: false,
};

export const VERDICT_MOTION: Record<Verdict, VerdictMotion> = {
  safe: {
    banner: 'drop',
    badge: 'pop',
    badgeDelay: 360,
    mascot: 'mpop',
    mascotDelay: 450,
    stagger: true,
    mascotIdle: true,
    sparkles: true,
  },
  caution: { ...FIRM, mascotIdle: true },
  unknown: { ...FIRM, mascotIdle: true },
  toxic: { ...FIRM, mascotIdle: false },
};

/** The rise stagger under a `safe` banner (the A4 artboard's `animation-delay`s), in order. */
export const RESULT_STAGGER = {
  verdictWord: 250,
  itemName: 320,
  subject: 380,
  headline: 600,
  firstCard: 700,
  step: 70,
} as const;

/**
 * The boot splash (docs/02 D26). Short on purpose: this app is opened in a hurry, and nothing
 * under the splash waits for it — the first screen is already mounted and interactive-ready.
 */
export const SPLASH = {
  coinDelay: 0,
  wordmarkDelay: 250,
  flipAt: 650,
  /** When the fade-out starts. */
  holdUntil: 1250,
  fadeOut: 250,
} as const;

/** The longest a result can take to show its verdict word, from mount. */
export function verdictRevealMs(verdict: Verdict): number {
  const m = VERDICT_MOTION[verdict];
  const banner = ENTRANCES[m.banner].duration;
  const word = m.stagger ? RESULT_STAGGER.verdictWord + ENTRANCES.rise.duration : 0;
  return Math.max(banner, word, m.badgeDelay + ENTRANCES[m.badge].duration);
}
