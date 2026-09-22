import type { Species } from '@canmyeatthis/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { SpeciesToggle } from '@/components/inputs';
import { ScrollScreen, Section } from '@/components/layout';
import { Button, Text } from '@/components/primitives';

/**
 * Pet profile (docs/06 §4, docs/10 §4).
 *
 * Name and species only. **There is no weight field, and there will not be one**: weight existed
 * in the funded plan to drive dose bands and risk banding, both cut (AGENTS.md #16) because they
 * are the highest-expertise feature in the plan and cannot be done unreviewed. Collecting a
 * number the app must then refuse to use would be worse than not asking — so the screen says so
 * out loud rather than leaving a suspicious gap.
 */
export default function Profile() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('dog');

  return (
    <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
      <Text variant="title" tone="primary" accessibilityRole="header">
        {t('profile:title')}
      </Text>
      <Text variant="body" tone="secondary">
        {t('profile:body')}
      </Text>

      <Section title={t('profile:nameLabel')}>
        <TextInput
          accessibilityLabel={t('profile:nameLabel')}
          placeholder={t('profile:namePlaceholder')}
          value={name}
          onChangeText={setName}
          className="rounded-md border border-line-default bg-surface-raised p-3 text-body text-ink-primary"
        />
      </Section>

      <Section title={t('profile:speciesLabel')}>
        <SpeciesToggle value={species} onChange={setSpecies} />
      </Section>

      <View className="rounded-md bg-surface-sunken p-3">
        <Text variant="caption" tone="secondary">
          {t('profile:noWeightNote')}
        </Text>
      </View>

      <Button label={t('profile:save')} onPress={() => setName(name.trim())} />
      <Button label={t('profile:clear')} variant="quiet" onPress={() => setName('')} />
    </ScrollScreen>
  );
}
