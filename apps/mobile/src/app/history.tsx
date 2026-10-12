import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { EmptyState, VerdictCard } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { Button, Text } from '@/components/primitives';
import { matchesSearch } from '@/lib/history';
import { type HistoryRowView, toRowView } from '@/lib/historyRows';
import { useHistoryStore } from '@/lib/historyStore';
import { useSettingsStore } from '@/lib/settings';
import { verdictWordKey } from '@/theme/verdict';

/**
 * History (docs/00 §2.5): past checks from the on-device store (`lib/history.ts`), newest first,
 * searchable, each one re-openable and deletable.
 *
 * A row shows and re-opens **today's** answer, resolved again from the bundled KB, not the one
 * stored at the time: an entry corrected since must never be re-shown with its old, more
 * optimistic verdict (AGENTS.md #10). When the two differ, the row says what it was. Each row
 * still stamps the KB version that answered it then (docs/04-knowledge-base.md §5).
 */
export default function HistoryRoute() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const records = useHistoryStore((state) => state.records);
  const loaded = useHistoryStore((state) => state.loaded);
  const load = useHistoryStore((state) => state.load);
  const remove = useHistoryStore((state) => state.remove);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  const disclaimer = t('legal:disclaimer');
  const rows = useMemo(
    () => records.map((record) => toRowView(record, language, disclaimer)),
    [records, language, disclaimer],
  );

  const filtered = rows.filter((row) =>
    matchesSearch([row.name, row.record.displayName, row.record.query], query),
  );

  const open = (row: HistoryRowView) => {
    const { target } = row;
    router.push(
      target.kind === 'entry'
        ? {
            pathname: '/result',
            params: { kbId: target.kbId, species: target.species, fromHistory: '1' },
          }
        : {
            pathname: '/result',
            params: {
              unknown: '1',
              query: target.query,
              species: target.species,
              fromHistory: '1',
            },
          },
    );
  };

  return (
    <ScrollScreen contentClassName="gap-4 px-4 pb-6 pt-2">
      <Text variant="title" tone="primary" accessibilityRole="header">
        {t('history:title')}
      </Text>

      {rows.length > 0 ? (
        <TextInput
          accessibilityLabel={t('history:searchPlaceholder')}
          placeholder={t('history:searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          className="rounded-md border border-line-default bg-surface-raised p-3 text-body text-ink-primary"
        />
      ) : null}

      {!loaded ? null : rows.length === 0 ? (
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
            <View key={row.record.id} className="gap-1">
              <VerdictCard
                verdict={row.verdictNow}
                itemName={row.name}
                species={row.record.species}
                detail={t('history:checkedAt', { date: row.record.checkedAt })}
                onPress={() => open(row)}
              />
              {row.changed ? (
                <Text variant="caption" tone="secondary">
                  {t('history:answerChanged', {
                    verdictWord: t(verdictWordKey(row.record.verdict)),
                  })}
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="caption" tone="tertiary" className="flex-1">
                  {t('history:kbStamp', { version: row.record.kbVersion })}
                </Text>
                <Button
                  label={t('history:delete')}
                  variant="quiet"
                  accessibilityHint={t('history:deleteA11yHint')}
                  onPress={() => void remove(row.record.id)}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}
