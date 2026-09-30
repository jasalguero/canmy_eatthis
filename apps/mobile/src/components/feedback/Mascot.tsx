import { type ReactNode, useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { Loop, keyframeStyle, useEntrance, useMotionEnabled } from '@/components/primitives';
import {
  MASCOT_EYE_HIGHLIGHT,
  MASCOT_INK,
  MASCOT_PALETTE,
  MASCOT_SWEAT,
  type MascotMood,
  type MascotSpecies,
} from '@/theme/mascot';
import { BLINK, type LoopKind, SWEAT, SWEAT_DELAY } from '@/theme/motion';

/**
 * The Bold Ink dog and cat (docs/02-tech-decisions.md D25) — the one piece of pure "eye candy"
 * the redesign asked for that is also load-bearing: the mood it renders in is driven by the
 * verdict (`theme/mascot.ts`'s `VERDICT_MASCOT_MOOD`), so it is another non-colour signal in the
 * same spirit as the verdict glyph (docs/06 §1) rather than decoration layered on top of one.
 *
 * **Still by default; `animated` brings it to life (docs/02 D26).** Animated, it is drawn as a
 * stack of same-sized `Svg` layers — ears, nose, sweat drop and "?" each on their own — so each
 * moving part is an ordinary `Animated.View` transform on the native driver, the canvas's
 * `.a-earL`/`.a-nose`/`.a-sweat`/`.a-q` groups one-for-one. Still (the default, reduced motion,
 * the gallery, screenshots), it is the single flat `Svg` it always was. The mood never animates:
 * it is chosen by the caller and drawn immediately, so the signal is there from the first frame.
 *
 * Pure decoration to assistive tech either way: every call site is expected to keep this
 * `aria-hidden` (the default here) and say the same thing in text nearby, exactly as the
 * existing verdict glyph does.
 */
export interface MascotProps {
  species: MascotSpecies;
  mood?: MascotMood;
  /** `head`: a tight face crop, for small contexts (the species toggle). `peek`: head and paws
   *  hooked over an edge, for the mascot appearing as its own small scene (banner, Identifying). */
  pose?: 'head' | 'peek';
  /** Edge length in points; the aspect ratio is fixed per `pose`. */
  size: number;
  /** Only set this when the mascot is the ONLY thing conveying information at that spot (it
   *  never should be — see the doc comment above). Defaults to decorative. */
  accessibilityLabel?: string;
  /** Idle life: head bob, blink, ears, and the mood's own motion (sniff, sweat, "?"). */
  animated?: boolean;
  /** `.calm` on the canvas's toxic artboard: keeps the blink and sweat, drops the bob and ears. */
  calm?: boolean;
}

const HEAD_VIEWBOX = '0 16 200 142';
const HEAD_ASPECT = 142 / 200;
const PEEK_VIEWBOX = '0 0 200 172';
const PEEK_ASPECT = 172 / 200;

/** One eye pair + brows, positioned identically for both species (the head shape differs, the
 *  eye line does not) so every mood is defined once. */
function Face({
  mood,
  species,
  blink = false,
}: {
  mood: MascotMood;
  species: MascotSpecies;
  /** Mid-blink (`a-blink`): the eyes squash to a line and lose their highlights. */
  blink?: boolean;
}) {
  const eyeY = species === 'cat' ? 92 : 84;
  const left = 78;
  const right = 122;
  const ink = MASCOT_INK;
  const lid = (ry: number) => (blink ? ry * 0.15 : ry);
  const glint = blink ? 0 : 1;

  const openEyes = (dy = 0) => (
    <G>
      <Ellipse cx={left} cy={eyeY + dy} rx={9.5} ry={lid(11.5)} fill={ink} />
      <Ellipse cx={right} cy={eyeY + dy} rx={9.5} ry={lid(11.5)} fill={ink} />
      <Circle
        cx={left + 3}
        cy={eyeY + dy - 4.5}
        r={3.6}
        fill={MASCOT_EYE_HIGHLIGHT}
        opacity={glint}
      />
      <Circle
        cx={right + 3}
        cy={eyeY + dy - 4.5}
        r={3.6}
        fill={MASCOT_EYE_HIGHLIGHT}
        opacity={glint}
      />
    </G>
  );

  switch (mood) {
    case 'happy':
      return (
        <G>
          <Path
            d={`M${left - 10} ${eyeY - 20} Q${left} ${eyeY - 27} ${left + 9} ${eyeY - 21}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 9} ${eyeY - 21} Q${right} ${eyeY - 27} ${right + 10} ${eyeY - 20}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${left - 10} ${eyeY + 3} Q${left} ${eyeY - 9} ${left + 10} ${eyeY + 3}`}
            fill="none"
            stroke={ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 10} ${eyeY + 3} Q${right} ${eyeY - 9} ${right + 10} ${eyeY + 3}`}
            fill="none"
            stroke={ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </G>
      );
    case 'worried':
      return (
        <G>
          <Path
            d={`M${left - 12} ${eyeY - 14} Q${left - 2} ${eyeY - 18} ${left + 8} ${eyeY - 25}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 8} ${eyeY - 25} Q${right + 2} ${eyeY - 18} ${right + 12} ${eyeY - 14}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {openEyes(2)}
        </G>
      );
    case 'confused':
      return (
        <G>
          <Path
            d={`M${left - 10} ${eyeY - 24} Q${left} ${eyeY - 33} ${left + 10} ${eyeY - 26}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 9} ${eyeY - 17} L${right + 10} ${eyeY - 19}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Ellipse cx={left} cy={eyeY} rx={9.5} ry={lid(11.5)} fill={ink} />
          <Ellipse cx={right} cy={eyeY + 1} rx={7} ry={lid(8.5)} fill={ink} />
          <Circle
            cx={left + 3}
            cy={eyeY - 4.5}
            r={3.6}
            fill={MASCOT_EYE_HIGHLIGHT}
            opacity={glint}
          />
          <Circle
            cx={right + 2.5}
            cy={eyeY - 2.5}
            r={2.8}
            fill={MASCOT_EYE_HIGHLIGHT}
            opacity={glint}
          />
        </G>
      );
    case 'cautious':
      return (
        <G>
          <Path
            d={`M${left - 10} ${eyeY - 16} L${left + 10} ${eyeY - 13}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 10} ${eyeY - 13} L${right + 10} ${eyeY - 16}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Ellipse cx={left + 3} cy={eyeY + 2} rx={9} ry={lid(9)} fill={ink} />
          <Ellipse cx={right + 3} cy={eyeY + 2} rx={9} ry={lid(9)} fill={ink} />
          <Circle cx={left + 6} cy={eyeY + 1} r={3} fill={MASCOT_EYE_HIGHLIGHT} opacity={glint} />
          <Circle cx={right + 6} cy={eyeY + 1} r={3} fill={MASCOT_EYE_HIGHLIGHT} opacity={glint} />
          <Path
            d={`M${left - 11} ${eyeY - 2} L${left + 12} ${eyeY - 2}`}
            fill="none"
            stroke={ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 11} ${eyeY - 2} L${right + 12} ${eyeY - 2}`}
            fill="none"
            stroke={ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </G>
      );
    case 'sniff':
      return (
        <G>
          <Path
            d={`M${left - 10} ${eyeY - 17} Q${left} ${eyeY - 22} ${left + 9} ${eyeY - 17}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 9} ${eyeY - 17} Q${right} ${eyeY - 22} ${right + 10} ${eyeY - 17}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {openEyes(4)}
        </G>
      );
    default:
      return (
        <G>
          <Path
            d={`M${left - 10} ${eyeY - 20} Q${left} ${eyeY - 26} ${left + 9} ${eyeY - 21}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d={`M${right - 9} ${eyeY - 21} Q${right} ${eyeY - 26} ${right + 10} ${eyeY - 20}`}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {openEyes()}
        </G>
      );
  }
}

/** A worry sweat drop, drawn in the same corner every time — reused across species. */
function SweatDrop({ x, y }: { x: number; y: number }) {
  return (
    <Path
      d={`M${x} ${y} C${x} ${y} ${x - 8} ${y + 12} ${x - 8} ${y + 17} C${x - 8} ${y + 22} ${x - 4} ${y + 25} ${x} ${y + 25} C${x + 4} ${y + 25} ${x + 8} ${y + 22} ${x + 8} ${y + 17} C${x + 8} ${y + 12} ${x} ${y} ${x} ${y} Z`}
      fill={MASCOT_SWEAT}
      stroke={MASCOT_INK}
      strokeWidth={3}
      strokeLinejoin="round"
    />
  );
}

/** A "?" over the head, for `confused`. */
function QuestionMark({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Path
        d={`M${x} ${y + 10} C${x} ${y} ${x + 18} ${y - 2} ${x + 19} ${y + 9} C${x + 20} ${y + 17} ${x + 9} ${y + 18} ${x + 9} ${y + 27}`}
        fill="none"
        stroke={MASCOT_INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Circle cx={x + 9} cy={y + 37} r={3.8} fill={MASCOT_INK} />
    </G>
  );
}

/**
 * A piece of the drawing that moves on its own (docs/02 D26) — the canvas's `.a-earL`, `.a-nose`,
 * `.a-sweat`, … groups. `origin` is its pivot in viewBox units, the canvas's `transform-origin`
 * resolved against that group's bounding box.
 */
type LayerMotion =
  | { kind: 'loop'; loop: LoopKind; origin: [number, number]; delay?: number }
  | { kind: 'sweat' };

interface Layer {
  key: string;
  node: ReactNode;
  motion?: LayerMotion;
  /** Paws and sniff puffs stay put while the head bobs. */
  fixed?: boolean;
}

/** The layers, back to front. Rendered flat into one `Svg` when the mascot is still. */
function dogLayers(mood: MascotMood, blink: boolean): Layer[] {
  const c = MASCOT_PALETTE.dog;
  const ink = MASCOT_INK;
  return [
    {
      key: 'head',
      node: (
        <G>
          <Path
            d="M100 36 C136 36 158 58 158 90 C158 122 134 142 100 142 C66 142 42 122 42 90 C42 58 64 36 100 36 Z"
            fill={c.fur}
            stroke={ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <Path
            d="M114 60 C134 54 148 70 144 88 C140 102 120 100 113 86 C109 77 108 64 114 60 Z"
            fill={c.patch}
          />
          <Ellipse cx={64} cy={108} rx={9} ry={5} fill={c.blush} opacity={0.55} />
          <Ellipse cx={136} cy={108} rx={9} ry={5} fill={c.blush} opacity={0.55} />
        </G>
      ),
    },
    {
      key: 'earL',
      motion: { kind: 'loop', loop: 'ear', origin: [59, 54] },
      node: (
        <Path
          d="M58 54 C38 50 24 70 26 96 C28 118 40 128 52 122 C62 116 64 96 66 76 C67 64 66 57 58 54 Z"
          fill={c.patch}
          stroke={ink}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      ),
    },
    {
      key: 'earR',
      motion: { kind: 'loop', loop: 'ear', origin: [142, 54] },
      node: (
        <Path
          d="M142 54 C162 50 176 70 174 96 C172 118 160 128 148 122 C138 116 136 96 134 76 C133 64 134 57 142 54 Z"
          fill={c.patch}
          stroke={ink}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      ),
    },
    {
      key: 'face',
      node: (
        <G>
          <Face mood={mood} species="dog" blink={blink} />
          <Ellipse cx={100} cy={114} rx={30} ry={21} fill={c.muzzle} stroke={ink} strokeWidth={4} />
          <Path
            d="M100 110 V117 M86 117 Q93 125 100 117 Q107 125 114 117"
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ),
    },
    {
      key: 'nose',
      motion: mood === 'sniff' ? { kind: 'loop', loop: 'sniff', origin: [100, 103] } : undefined,
      node: (
        <G>
          <Path
            d="M88 101 C88 94 112 94 112 101 C112 107 104 111 100 111 C96 111 88 107 88 101 Z"
            fill={ink}
          />
          <Ellipse cx={95} cy={99} rx={4} ry={2.2} fill={MASCOT_EYE_HIGHLIGHT} opacity={0.85} />
        </G>
      ),
    },
    ...moodExtras(mood, { sweat: [152, 48], question: [150, 6] }),
  ];
}

function catLayers(mood: MascotMood, blink: boolean): Layer[] {
  const c = MASCOT_PALETTE.cat;
  const ink = MASCOT_INK;
  return [
    {
      key: 'earL',
      motion: { kind: 'loop', loop: 'twitch', origin: [74, 78] },
      node: (
        <G>
          <Path
            d="M52 78 L54 24 L96 52 Z"
            fill={c.fur}
            stroke={ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <Path d="M61 64 L62 38 L84 52 Z" fill={c.blush} opacity={0.8} />
        </G>
      ),
    },
    {
      key: 'earR',
      motion: { kind: 'loop', loop: 'twitch', origin: [126, 78], delay: 500 },
      node: (
        <G>
          <Path
            d="M148 78 L146 24 L104 52 Z"
            fill={c.fur}
            stroke={ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <Path d="M139 64 L138 38 L116 52 Z" fill={c.blush} opacity={0.8} />
        </G>
      ),
    },
    {
      key: 'face',
      node: (
        <G>
          <Path
            d="M100 44 C142 44 162 68 162 98 C162 128 136 146 100 146 C64 146 38 128 38 98 C38 68 58 44 100 44 Z"
            fill={c.fur}
            stroke={ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <Path
            d="M100 51 V64 M87 54 L89.5 64 M113 54 L110.5 64 M41 94 H53 M42 106 H53 M159 94 H147 M158 106 H147"
            fill="none"
            stroke={c.patch}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Ellipse cx={66} cy={114} rx={9} ry={5} fill={c.blush} opacity={0.5} />
          <Ellipse cx={134} cy={114} rx={9} ry={5} fill={c.blush} opacity={0.5} />
          <Face mood={mood} species="cat" blink={blink} />
          <Ellipse cx={89} cy={117} rx={13} ry={10} fill={c.muzzle} />
          <Ellipse cx={111} cy={117} rx={13} ry={10} fill={c.muzzle} />
          <Path
            d="M88 118 Q94 124 100 118 Q106 124 112 118"
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ),
    },
    {
      key: 'nose',
      motion: mood === 'sniff' ? { kind: 'loop', loop: 'sniff', origin: [100, 110] } : undefined,
      node: (
        <Path
          d="M93.5 106 L106.5 106 L100 113.5 Z"
          fill={c.blush}
          stroke={c.blush}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ),
    },
    {
      key: 'whiskers',
      node: (
        <Path
          d="M77 115 L52 110 M77 121 L54 127 M123 115 L148 110 M123 121 L146 127"
          fill="none"
          stroke={ink}
          strokeWidth={3}
        />
      ),
    },
    ...moodExtras(mood, { sweat: [156, 52], question: [152, 8] }),
  ];
}

function moodExtras(
  mood: MascotMood,
  at: { sweat: [number, number]; question: [number, number] },
): Layer[] {
  if (mood === 'worried') {
    return [
      {
        key: 'sweat',
        motion: { kind: 'sweat' },
        node: <SweatDrop x={at.sweat[0]} y={at.sweat[1]} />,
      },
    ];
  }
  if (mood === 'confused') {
    const [x, y] = at.question;
    return [
      {
        key: 'question',
        // `.a-q`: `transform-origin: 50% 100%` of the "?" — its dot's foot.
        motion: { kind: 'loop', loop: 'wobble', origin: [x + 9.5, y + 41] },
        node: <QuestionMark x={x} y={y} />,
      },
    ];
  }
  return [];
}

/** The paws hooked over an edge — the `peek` pose's lower half, shared by both species. */
function Paws({ species }: { species: MascotSpecies }) {
  const fill = MASCOT_PALETTE[species].fur;
  return (
    <G>
      <Ellipse cx={68} cy={156} rx={19} ry={12} fill={fill} stroke={MASCOT_INK} strokeWidth={4} />
      <Ellipse cx={132} cy={156} rx={19} ry={12} fill={fill} stroke={MASCOT_INK} strokeWidth={4} />
      <Path
        d="M62 150 V158 M73 149 V158 M127 149 V158 M138 150 V158"
        fill="none"
        stroke={MASCOT_INK}
        strokeWidth={3}
      />
    </G>
  );
}

/** `.a-puff`: three rings drifting off while sniffing (the canvas's A3 positions). */
const PUFFS: readonly { cx: number; cy: number; r: number; delay: number }[] = [
  { cx: 72, cy: 92, r: 6, delay: 0 },
  { cx: 64, cy: 100, r: 5, delay: 360 },
  { cx: 76, cy: 104, r: 4, delay: 720 },
];

/** Moods whose eyes are open, so a blink reads — `happy`'s are already closed arcs. */
const BLINKS: Record<MascotMood, boolean> = {
  idle: true,
  happy: false,
  worried: true,
  confused: true,
  cautious: true,
  sniff: true,
};

export function Mascot({
  species,
  mood = 'idle',
  pose = 'peek',
  size,
  animated = false,
  calm = false,
  accessibilityLabel,
}: MascotProps) {
  const viewBox = pose === 'head' ? HEAD_VIEWBOX : PEEK_VIEWBOX;
  const [vbX, vbY] = pose === 'head' ? [0, 16] : [0, 0];
  const height = size * (pose === 'head' ? HEAD_ASPECT : PEEK_ASPECT);
  /** Points per viewBox unit — both viewBoxes are 200 wide. */
  const unit = size / 200;

  const motionOn = useMotionEnabled() && animated;
  const blink = useBlink(motionOn && BLINKS[mood]);

  const layers: Layer[] = [
    ...(species === 'dog' ? dogLayers(mood, blink) : catLayers(mood, blink)),
    ...(pose === 'peek' ? [{ key: 'paws', node: <Paws species={species} />, fixed: true }] : []),
  ];

  const frame = { width: size, height };
  const svg = (key: string, children: ReactNode) => (
    <Svg key={key} width={size} height={height} viewBox={viewBox} style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );

  let body: ReactNode;
  if (!motionOn) {
    // Exactly the pre-D26 drawing: one `Svg`, every layer in order.
    body = (
      <Svg width={size} height={height} viewBox={viewBox}>
        {layers.map((l) => (
          <G key={l.key}>{l.node}</G>
        ))}
      </Svg>
    );
  } else {
    // A point in viewBox units as an offset from the frame's centre, in points (see `KeyframeScale`).
    const pivotOf = ([x, y]: [number, number]): [number, number] => [
      (x - vbX) * unit - size / 2,
      (y - vbY) * unit - height / 2,
    ];
    const renderLayer = (l: Layer) => {
      const m = l.motion;
      if (!m || (calm && m.kind === 'loop' && (m.loop === 'ear' || m.loop === 'twitch'))) {
        return svg(l.key, l.node);
      }
      if (m.kind === 'sweat') {
        return (
          <SweatLayer key={l.key} unit={unit}>
            {svg('s', l.node)}
          </SweatLayer>
        );
      }
      return (
        <Loop
          key={l.key}
          kind={m.loop}
          delay={m.delay}
          pivot={pivotOf(m.origin)}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {svg('l', l.node)}
        </Loop>
      );
    };
    const head = layers.filter((l) => !l.fixed);
    const fixed = layers.filter((l) => l.fixed);
    body = (
      <>
        <Loop
          kind="bob"
          enabled={!calm}
          unit={unit}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {head.map(renderLayer)}
        </Loop>
        {fixed.map(renderLayer)}
        {mood === 'sniff' && pose === 'peek'
          ? PUFFS.map((p) => (
              <Loop
                key={`puff${p.delay}`}
                kind="puff"
                delay={p.delay}
                unit={unit}
                pivot={pivotOf([p.cx, p.cy])}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                {svg(
                  'p',
                  <Circle
                    cx={p.cx}
                    cy={p.cy}
                    r={p.r}
                    fill="none"
                    stroke={MASCOT_INK}
                    strokeWidth={3}
                  />,
                )}
              </Loop>
            ))
          : null}
      </>
    );
  }

  // The accessibility props live on a wrapping `View`, not the `Svg` — `react-native-svg`'s web
  // implementation forwards unrecognised props straight to the DOM `<svg>` element, and RN-only
  // accessibility props like `accessibilityElementsHidden`/`importantForAccessibility` triggered
  // "React does not recognize the `…` prop" in the real web export (caught in the Phase 2
  // screenshot run, not by typecheck). `View` supports all of these natively, including on web.
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={frame}
    >
      {body}
    </View>
  );
}

/** `a-sweat`: slides down once, 0.9s after the mascot appears, and stays. */
function SweatLayer({ unit, children }: { unit: number; children: ReactNode }) {
  const progress = useEntrance(SWEAT, { delay: SWEAT_DELAY });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, keyframeStyle(progress, SWEAT, { unit })]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * `a-blink`, as a flipbook: shut for `BLINK.closed` ms every `BLINK.period` ms. A state swap, not
 * a transform — an eye's scale would need its own layer per eye, per mood, for a 150ms event.
 */
function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setClosed(false);
      return;
    }
    let reopen: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setClosed(true);
      reopen = setTimeout(() => setClosed(false), BLINK.closed);
    }, BLINK.period);
    return () => {
      clearInterval(id);
      if (reopen) clearTimeout(reopen);
    };
  }, [enabled]);
  return closed;
}
