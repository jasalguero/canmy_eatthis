import type { Source, Species, Verdict } from '@canmyeatthis/shared';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable } from 'react-native';

import { Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow, sizes } from '@/theme/tokens';

/**
 * The app's actual claim, and a primary UI element rather than a footnote (docs/10 §4).
 *
 * "The Merck Veterinary Manual lists dark chocolate as toxic to dogs →" is a statement this
 * project can support; "dark chocolate is toxic to dogs" is a veterinary claim it cannot make
 * without a vet. That distinction is the whole editorial standard, so this component sits
 * directly under the headline on every result, above every collapsible section.
 *
 * The sentence is one complete ICU message with a `select` on the verdict, never concatenated
 * fragments (AGENTS.md #11) — Spanish puts the verdict adjective after the item and inflects it,
 * which no amount of string joining gets right.
 */
export interface SourceCiteProps {
  source: Source;
  itemName: string;
  verdict: Verdict;
  species: Species;
  className?: string;
}

export function SourceCite({ source, itemName, verdict, species, className }: SourceCiteProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const sentence = t('result:sourceCite', {
    source: source.label,
    item: itemName,
    verdict,
    species,
  });

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={sentence}
      accessibilityHint={t('result:sourceCiteA11yHint')}
      onPress={() => {
        void Linking.openURL(source.url);
      }}
      style={[{ minHeight: sizes.touchTarget }, hardShadow[1][theme]]}
      className={[
        'justify-center rounded-md border-[3px] border-line-strong bg-surface-raised p-3 active:bg-surface-sunken',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Text variant="body" tone="primary">
        {sentence}
        {/* The arrow is part of the visual sentence but already implied by the link role.
            `brand-link`, not `brand-primary`: this renders as text, and `primary` is a fill-only
            colour under Bold Ink (docs/02 D25) — see tokens.ts's doc comment on `brand.link`. */}
        <Text variant="body" className="text-brand-link">
          {' →'}
        </Text>
      </Text>
    </Pressable>
  );
}
