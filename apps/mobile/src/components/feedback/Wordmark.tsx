import type { Species } from '@canmyeatthis/shared';
import { useTranslation } from 'react-i18next';
import { Text as RNText, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow, radius, tokens } from '@/theme/tokens';
import { Mascot } from './Mascot';

/**
 * The app wordmark (docs/02-tech-decisions.md D25) — a small mascot "coin" beside the app name,
 * for a screen's header. The design canvas's own header lockup interleaves the mascot mid-
 * sentence ("Can my 🐕 eat this?"), but that is exactly the shape AGENTS.md #11 rules out: word
 * order differs between languages, so a decorative icon can never sit inside a translated phrase.
 * This renders the icon and `common:appName` as two siblings instead — same idea, i18n-safe.
 *
 * `species` picks which animal the coin shows; it's decorative only (a brand mark, not a status
 * indicator), so a caller with no species context yet can omit it.
 *
 * **The name text shrinks-to-fit at large scale, unlike every other string in this app.** docs/06
 * §5 and `Text.tsx`'s own header comment are explicit that font scaling is never capped — but
 * `common:appName` is one continuous unbreakable "word" (no spaces around the `*`), so at `es` +
 * 200% it cannot wrap the way a real sentence would, and it overflowed the screen edge and pushed
 * the header's icon buttons out of view entirely (caught by the `es`-200% screenshot set). The
 * fix is `adjustsFontSizeToFit`/`minimumFontScale`, not `allowFontScaling={false}`: the text still
 * grows with the OS setting up to whatever width this row actually has, and only backs off from
 * there — a safety valve for one unbreakable brand string sharing a row with fixed-size icons,
 * not a general exception to the no-capping rule.
 *
 * **This is raw `Text` from `react-native`, not the shared `Text` primitive, and `font-display`
 * alone rather than `variant="display"`.** `scripts/screenshots.mjs`'s `es`-200% simulation
 * overrides `.text-<role>` with `font-size: ... !important`, which beats ANY inline `style`
 * override on that element regardless of variant — so a `Text variant="display"` here, sized down
 * by an inline style, silently rendered at the full doubled 68px instead (confirmed: it then hit
 * `minimumFontScale`'s floor and truncated to "Can…"). Skipping the `text-display` size class
 * entirely and keeping only the `font-display` family class is what makes the inline `fontSize`
 * — and therefore `adjustsFontSizeToFit` — actually take effect.
 */
export function Wordmark({
  species = 'dog',
  size = 28,
}: {
  species?: Species;
  size?: number;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const t_ = tokens[theme];

  return (
    <View className="shrink flex-row items-center gap-2" style={{ minWidth: 0 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: size,
          height: size,
          borderRadius: radius.full,
          borderWidth: 2.5,
          borderColor: t_.border.strong,
          backgroundColor: species === 'cat' ? t_.brand.tintCat : t_.brand.tintDog,
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          ...hardShadow[1][theme],
        }}
      >
        <Mascot species={species} pose="head" size={size * 1.05} />
      </View>
      <RNText
        className="font-display text-ink-primary"
        style={{ fontSize: 20, lineHeight: 22, flexShrink: 1 }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
        accessibilityRole="header"
      >
        {t('common:appName')}
      </RNText>
    </View>
  );
}
