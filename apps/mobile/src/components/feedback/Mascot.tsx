import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import {
  MASCOT_EYE_HIGHLIGHT,
  MASCOT_INK,
  MASCOT_PALETTE,
  MASCOT_SWEAT,
  type MascotMood,
  type MascotSpecies,
} from '@/theme/mascot';

/**
 * The Bold Ink dog and cat (docs/02-tech-decisions.md D25) — the one piece of pure "eye candy"
 * the redesign asked for that is also load-bearing: the mood it renders in is driven by the
 * verdict (`theme/mascot.ts`'s `VERDICT_MASCOT_MOOD`), so it is another non-colour signal in the
 * same spirit as the verdict glyph (docs/06 §1) rather than decoration layered on top of one.
 *
 * **Static.** Nothing here uses `react-native-reanimated` — docs/02 D23 found that library's
 * animated styles do not reliably reach a real device, and this component has no way to verify
 * otherwise in this environment (no full Xcode install here to test on a Simulator or device).
 * Where a screen wants this mascot to visibly move, it does so by swapping `mood`/`pose` on a
 * timer and letting React re-render — the same plain state-and-`setTimeout` mechanism
 * `identifying.tsx` already uses successfully for its stage list, not an animation library.
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
}

const HEAD_VIEWBOX = '0 16 200 142';
const HEAD_ASPECT = 142 / 200;
const PEEK_VIEWBOX = '0 0 200 172';
const PEEK_ASPECT = 172 / 200;

/** One eye pair + brows, positioned identically for both species (the head shape differs, the
 *  eye line does not) so every mood is defined once. */
function Face({ mood, species }: { mood: MascotMood; species: MascotSpecies }) {
  const eyeY = species === 'cat' ? 92 : 84;
  const left = 78;
  const right = 122;
  const ink = MASCOT_INK;

  const openEyes = (dy = 0) => (
    <G>
      <Ellipse cx={left} cy={eyeY + dy} rx={9.5} ry={11.5} fill={ink} />
      <Ellipse cx={right} cy={eyeY + dy} rx={9.5} ry={11.5} fill={ink} />
      <Circle cx={left + 3} cy={eyeY + dy - 4.5} r={3.6} fill={MASCOT_EYE_HIGHLIGHT} />
      <Circle cx={right + 3} cy={eyeY + dy - 4.5} r={3.6} fill={MASCOT_EYE_HIGHLIGHT} />
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
          <Ellipse cx={left} cy={eyeY} rx={9.5} ry={11.5} fill={ink} />
          <Ellipse cx={right} cy={eyeY + 1} rx={7} ry={8.5} fill={ink} />
          <Circle cx={left + 3} cy={eyeY - 4.5} r={3.6} fill={MASCOT_EYE_HIGHLIGHT} />
          <Circle cx={right + 2.5} cy={eyeY - 2.5} r={2.8} fill={MASCOT_EYE_HIGHLIGHT} />
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
          <Ellipse cx={left + 3} cy={eyeY + 2} rx={9} ry={9} fill={ink} />
          <Ellipse cx={right + 3} cy={eyeY + 2} rx={9} ry={9} fill={ink} />
          <Circle cx={left + 6} cy={eyeY + 1} r={3} fill={MASCOT_EYE_HIGHLIGHT} />
          <Circle cx={right + 6} cy={eyeY + 1} r={3} fill={MASCOT_EYE_HIGHLIGHT} />
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

function DogHead({ mood }: { mood: MascotMood }) {
  const c = MASCOT_PALETTE.dog;
  const ink = MASCOT_INK;
  return (
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
      <Path
        d="M58 54 C38 50 24 70 26 96 C28 118 40 128 52 122 C62 116 64 96 66 76 C67 64 66 57 58 54 Z"
        fill={c.patch}
        stroke={ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Path
        d="M142 54 C162 50 176 70 174 96 C172 118 160 128 148 122 C138 116 136 96 134 76 C133 64 134 57 142 54 Z"
        fill={c.patch}
        stroke={ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Face mood={mood} species="dog" />
      <Ellipse cx={100} cy={114} rx={30} ry={21} fill={c.muzzle} stroke={ink} strokeWidth={4} />
      <Path
        d="M100 110 V117 M86 117 Q93 125 100 117 Q107 125 114 117"
        fill="none"
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M88 101 C88 94 112 94 112 101 C112 107 104 111 100 111 C96 111 88 107 88 101 Z"
        fill={ink}
      />
      <Ellipse cx={95} cy={99} rx={4} ry={2.2} fill={MASCOT_EYE_HIGHLIGHT} opacity={0.85} />
      {mood === 'worried' ? <SweatDrop x={152} y={48} /> : null}
      {mood === 'confused' ? <QuestionMark x={150} y={6} /> : null}
    </G>
  );
}

function CatHead({ mood }: { mood: MascotMood }) {
  const c = MASCOT_PALETTE.cat;
  const ink = MASCOT_INK;
  return (
    <G>
      <Path
        d="M52 78 L54 24 L96 52 Z"
        fill={c.fur}
        stroke={ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Path d="M61 64 L62 38 L84 52 Z" fill={c.blush} opacity={0.8} />
      <Path
        d="M148 78 L146 24 L104 52 Z"
        fill={c.fur}
        stroke={ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Path d="M139 64 L138 38 L116 52 Z" fill={c.blush} opacity={0.8} />
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
      <Face mood={mood} species="cat" />
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
      <Path
        d="M93.5 106 L106.5 106 L100 113.5 Z"
        fill={c.blush}
        stroke={c.blush}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M77 115 L52 110 M77 121 L54 127 M123 115 L148 110 M123 121 L146 127"
        fill="none"
        stroke={ink}
        strokeWidth={3}
      />
      {mood === 'worried' ? <SweatDrop x={156} y={52} /> : null}
      {mood === 'confused' ? <QuestionMark x={152} y={8} /> : null}
    </G>
  );
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

export function Mascot({
  species,
  mood = 'idle',
  pose = 'peek',
  size,
  accessibilityLabel,
}: MascotProps) {
  const viewBox = pose === 'head' ? HEAD_VIEWBOX : PEEK_VIEWBOX;
  const height = size * (pose === 'head' ? HEAD_ASPECT : PEEK_ASPECT);
  const Head = species === 'dog' ? DogHead : CatHead;

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
      style={{ width: size, height }}
    >
      <Svg width={size} height={height} viewBox={viewBox}>
        <Head mood={mood} />
        {pose === 'peek' ? <Paws species={species} /> : null}
      </Svg>
    </View>
  );
}
