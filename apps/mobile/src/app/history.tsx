import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { EmptyState, VerdictCard } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { Text } from '@/components/primitives';
import { devHistoryRows } from '@/lib/devPreview';
import { useSettingsStore } from '@/lib/settings';

/**
 * History (docs/07 Phase 8 owns the real SQLite store; Phase 2 builds the screen).
 *
 * Each row stamps the KB version that produced it, which is why the row renders from a resolved
 * payload rather than from a stored verdict string: an answer given under an older KB should be
 * re-readable as what it was, not silently restated under today's content.
 *
 * `?empty=1` renders the empty state, which is a designed screen rather than a blank list
 * (docs/06 §4).
 *
 * **Development builds only, for now.** Nothing records a check yet, so a release build would
 * show either a list that never fills or someone else's made-up history. Home hides its History
 * icon outside development for the same reason.
 */
export default function HistoryRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <History />;
}

function History() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => devHistoryRows(language, t('legal:disclaimer')), [language, t]);

  const filtered = query.trim()
    ? rows.filter((row) =>
        row.payload.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      )
    : rows;

  return (
    <ScrollScreen contentClassName="gap-4 px-4 pb-6 pt-2">
      <Text variant="title" tone="primary" accessibilityRole="header">
        {t('history:title')}
      </Text>

      <TextInput
        accessibilityLabel={t('history:searchPlaceholder')}
        placeholder={t('history:searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        className="rounded-md border border-line-default bg-surface-raised p-3 text-body text-ink-primary"
      />

      {rows.length === 0 ? (
        <EmptyState
          title={t('history:emptyTitle')}
          body={t('history:emptyBody')}
          actionLabel={t('history:emptyCta')}
          onAction={() => router.dismissTo('/')}
          className="flex-1"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('history:noResultsTitle')}
          body={t('history:noResultsBody', { query: query.trim() })}
          className="flex-1"
        />
      ) : (
        <View className="gap-3">
          {filtered.map((row) => (
            <View key={row.id} className="gap-1">
              <VerdictCard
                verdict={row.payload.verdict}
                itemName={row.payload.displayName}
                species={row.payload.species}
                detail={t('history:checkedAt', { date: row.checkedAt })}
                onPress={() => router.push({ pathname: '/result', params: { case: row.caseId } })}
              />
              <Text variant="caption" tone="tertiary">
                {t('history:kbStamp', { version: row.payload.kbVersion })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}
