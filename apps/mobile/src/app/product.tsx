import type { Species, Verdict, VerdictPayload } from '@canmyeatthis/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmergencyCallButton, Mascot, VerdictCard } from '@/components/feedback';
import { Collapsible, ScrollScreen, Section, StickyFooter } from '@/components/layout';
import { Button, Text } from '@/components/primitives';
import { type ProductLookup, lookupProduct } from '@/lib/barcode';
import { useDraftStore } from '@/lib/draft';
import { openEmergency } from '@/lib/emergency';
import { useSettingsStore } from '@/lib/settings';
import { buildRealVerdict } from '@/lib/verdict';
import { sizes } from '@/theme/tokens';

/**
 * A scanned product (docs/02-tech-decisions.md D29): the barcode looked up in Open Food Facts
 * from the phone, and its ingredient list matched against the bundled KB.
 *
 * The product's own name leads the screen, so the user can see it is the product they are holding
 * before reading anything else — the lookup is a database match, and a database can be wrong.
 *
 * Each recognised ingredient is a verdict card from the same `resolveVerdict()` as a typed lookup
 * (AGENTS.md #5), worst first, each opening its full result. What the screen never does is imply
 * the unrecognised ingredients are fine: with a few dozen KB entries, "not in our list" says
 * nothing about harm, so a product with no matches is `unknown`, with copy that says so
 * (AGENTS.md #2, #10).
 *
 * An unreachable database, an unknown product and a product without an ingredient list each get
 * their own honest state, and each leads back to typed lookup.
 */

const VERDICT_RANK: Record<Verdict, number> = { toxic: 0, caution: 1, unknown: 2, safe: 3 };

function worstFirst(a: VerdictPayload, b: VerdictPayload): number {
  const bySeverity = (p: VerdictPayload) => (p.severity === 'severe' ? 0 : 1);
  return VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || bySeverity(a) - bySeverity(b);
}

export default function Product() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string; species?: string }>();
  const code = params.code ?? '';
  const species: Species = params.species === 'cat' ? 'cat' : 'dog';
  const language = useSettingsStore((state) => state.language);
  const resetDraft = useDraftStore((state) => state.reset);

  const [lookup, setLookup] = useState<ProductLookup | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` is the "Try again" trigger itself.
  useEffect(() => {
    let cancelled = false;
    setLookup(null);
    void lookupProduct(code, language).then((result) => {
      if (!cancelled) setLookup(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, attempt]);

  const typeInstead = () => router.dismissTo('/');
  const scanAnother = () => router.replace({ pathname: '/camera', params: { mode: 'barcode' } });

  if (lookup === null) {
    return (
      <ScrollScreen contentClassName="flex-1 items-center justify-center gap-4 px-4">
        <Mascot species={species} mood="idle" pose="peek" size={sizes.mascotIdentifying} animated />
        <Text
          variant="headline"
          tone="primary"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
        >
          {t('product:lookingUp')}
        </Text>
      </ScrollScreen>
    );
  }

  if (lookup.kind !== 'found') {
    const key =
      lookup.kind === 'unavailable'
        ? 'unavailable'
        : lookup.kind === 'not_found'
          ? 'notFound'
          : 'noIngredients';
    return (
      <ScrollScreen contentClassName="flex-1 justify-center gap-4 px-6">
        {lookup.kind === 'no_ingredients' ? (
          <ProductHeader name={lookup.productName} code={code} />
        ) : null}
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t(`product:${key}Title`)}
        </Text>
        <Text variant="body" tone="secondary" accessibilityLiveRegion="polite">
          {t(`product:${key}Body`)}
        </Text>
        <View className="mt-2 gap-2">
          <Button label={t('product:typeInstead')} onPress={typeInstead} />
          {lookup.kind === 'unavailable' ? (
            <Button
              label={t('product:retry')}
              variant="secondary"
              onPress={() => setAttempt((n) => n + 1)}
            />
          ) : (
            <Button label={t('product:scanAnother')} variant="secondary" onPress={scanAnother} />
          )}
        </View>
      </ScrollScreen>
    );
  }

  const disclaimer = t('legal:disclaimer');
  const verdicts = lookup.matches
    .map((kbId) => buildRealVerdict({ kbId, species, language, disclaimer }))
    .sort(worstFirst);
  const hasToxic = verdicts.some((v) => v.verdict === 'toxic');

  return (
    <>
      <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
        <ProductHeader name={lookup.productName} code={code} />

        {verdicts.length > 0 ? (
          <Section title={t('product:matchesTitle')}>
            <View className="gap-2">
              {verdicts.map((v) => (
                <VerdictCard
                  key={v.kbId}
                  verdict={v.verdict}
                  itemName={v.displayName}
                  species={species}
                  detail={v.headline}
                  onPress={() =>
                    router.push({ pathname: '/result', params: { kbId: v.kbId, species } })
                  }
                />
              ))}
            </View>
            <Text variant="body" tone="secondary" className="mt-2">
              {t('product:matchesNote')}
            </Text>
          </Section>
        ) : (
          <Section>
            <VerdictCard
              verdict="unknown"
              itemName={lookup.productName ?? t('product:unnamedProduct')}
              species={species}
            />
            <Text variant="headline" tone="primary" accessibilityRole="header" className="mt-2">
              {t('product:noMatchesTitle')}
            </Text>
            <Text variant="body" tone="secondary">
              {t('product:noMatchesBody', { species })}
            </Text>
          </Section>
        )}

        <Collapsible title={t('product:ingredientsSection')}>
          <Text variant="body" tone="secondary">
            {lookup.ingredientsText}
          </Text>
        </Collapsible>

        <Text variant="caption" tone="tertiary">
          {t('product:attribution')}
        </Text>
        <Text variant="caption" tone="tertiary">
          {disclaimer}
        </Text>

        <View className="gap-2">
          <Button label={t('product:scanAnother')} variant="secondary" onPress={scanAnother} />
          <Button
            label={t('result:checkSomethingElse')}
            variant="quiet"
            onPress={() => {
              resetDraft();
              router.dismissTo('/');
            }}
            className="self-start"
          />
        </View>
      </ScrollScreen>

      {/* A toxic ingredient puts the call one tap away, as on the result screen (AGENTS.md #4). */}
      {hasToxic ? (
        <StickyFooter>
          <EmergencyCallButton onPress={openEmergency} />
        </StickyFooter>
      ) : null}
    </>
  );
}

function ProductHeader({ name, code }: { name: string | null; code: string }) {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      <Text variant="title" tone="primary" accessibilityRole="header">
        {name ?? t('product:unnamedProduct')}
      </Text>
      <Text variant="caption" tone="tertiary">
        {t('product:barcodeLine', { code })}
      </Text>
    </View>
  );
}
