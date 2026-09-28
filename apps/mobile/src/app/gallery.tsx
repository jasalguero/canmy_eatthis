import type { Verdict } from '@canmyeatthis/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  ConfidencePill,
  DisclaimerFooter,
  EmergencyCallButton,
  EmptyState,
  ErrorState,
  type ErrorStateCode,
  SourceCite,
  VerdictBanner,
  VerdictCard,
} from '@/components/feedback';
import { CheckButton, DescriptionInput, PhotoTray, SpeciesToggle } from '@/components/inputs';
import { Collapsible, ScrollScreen, Section } from '@/components/layout';
import {
  Button,
  Card,
  Divider,
  IconButton,
  Pill,
  Sheet,
  Skeleton,
  Text,
} from '@/components/primitives';
import { openEmergency } from '@/lib/emergency';
import { useSettingsStore } from '@/lib/settings';
import { MOCK_CASES, mockVerdict } from '@/mock/cases';
import type { MockLanguage } from '@/mock/kbEntries';
import { MOCK_PHOTO_URI } from '@/mock/photos';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ThemeName } from '@/theme/tokens';

/**
 * The dev gallery (docs/06 §3): every component in both themes, and every screen reachable.
 *
 * This is how the design system gets reviewed without paying for Storybook's setup, and it is
 * the surface the Phase 2 screenshots are taken from. Two properties make it useful rather than
 * decorative:
 *
 *  - **Both themes side by side, always.** Each block is rendered twice, wrapped in a
 *    `ThemeProvider` with an explicit theme, so a token that only works in light mode is visible
 *    immediately rather than at 2 a.m. on someone's phone.
 *  - **It renders the real mock cases**, so the four verdicts and all three severities are on
 *    screen together and can be compared — including in grayscale, which is the check that the
 *    glyph and the word are really carrying the signal and not the colour.
 *
 * Dev-only: the route renders a stub in a production build so it can never ship as a screen.
 */

const VERDICTS: readonly Verdict[] = ['safe', 'caution', 'toxic', 'unknown'];
const ERROR_CODES: readonly ErrorStateCode[] = [
  'offline',
  'SPEND_CAP_EXCEEDED',
  'IMAGE_UNUSABLE',
  'NO_SUBJECT_FOUND',
  'RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'UNAUTHENTICATED',
  'ATTESTATION_FAILED',
  'INVALID_REQUEST',
  'INTERNAL',
];

/** Renders its children once per theme, labelled. */
function BothThemes({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section title={title} className="gap-3">
      {(['light', 'dark'] as ThemeName[]).map((theme) => (
        <ThemeProvider key={theme} theme={theme}>
          <View className="gap-3 rounded-md border border-line-subtle p-3">
            <Text variant="caption" tone="tertiary">
              {theme}
            </Text>
            {children}
          </View>
        </ThemeProvider>
      ))}
    </Section>
  );
}

export default function Gallery() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([MOCK_PHOTO_URI]);

  if (!__DEV__) {
    return (
      <ScrollScreen contentClassName="px-4 py-6">
        <Text variant="body" tone="secondary">
          {t('settings:openGallery')}
        </Text>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen contentClassName="gap-6 px-4 pb-8 pt-2">
      <Text variant="title" tone="primary" accessibilityRole="header">
        {t('settings:openGallery')}
      </Text>

      {/* Switching language here is the fastest way to review `es` at length. */}
      <View className="flex-row gap-2">
        <Button
          label="en"
          variant={language === 'en' ? 'primary' : 'secondary'}
          onPress={() => setLanguage('en')}
        />
        <Button
          label="es"
          variant={language === 'es' ? 'primary' : 'secondary'}
          onPress={() => setLanguage('es')}
        />
      </View>

      <Section title="Screens">
        <View className="gap-2">
          <Button label="Home" variant="secondary" onPress={() => router.dismissTo('/')} />
          <Button
            label="Identifying"
            variant="secondary"
            onPress={() => router.push({ pathname: '/identifying', params: { hasPhoto: '1' } })}
          />
          <Button label="Confirm" variant="secondary" onPress={() => router.push('/confirm')} />
          <Button
            label="Confirm — plant"
            variant="secondary"
            onPress={() => router.push({ pathname: '/confirm', params: { plant: '1' } })}
          />
          {MOCK_CASES.map((mockCase) => (
            <Button
              key={mockCase.id}
              label={`Result — ${mockCase.id}`}
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/result', params: { case: mockCase.id, still: '1' } })
              }
            />
          ))}
          <Button label="History" variant="secondary" onPress={() => router.push('/history')} />
          <Button label="Profile" variant="secondary" onPress={() => router.push('/profile')} />
          <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
          <Button label="First run" variant="secondary" onPress={() => router.push('/first-run')} />
          {ERROR_CODES.map((code) => (
            <Button
              key={code}
              label={`Error — ${code}`}
              variant="secondary"
              onPress={() => router.push({ pathname: '/error', params: { code } })}
            />
          ))}
        </View>
      </Section>

      <BothThemes title="Primitives">
        <Button label="Primary" />
        <Button label="Secondary" variant="secondary" />
        <Button label="Quiet" variant="quiet" />
        <Button label="Loading" loading />
        <Button label="Disabled" disabled disabledReason={t('home:checkDisabledReason')} />
        <View className="flex-row items-center gap-2">
          <IconButton glyph="×" accessibilityLabel={t('common:close')} />
          <Pill label="Pill" />
        </View>
        <Card>
          <Text variant="body" tone="primary">
            Card
          </Text>
        </Card>
        <Divider />
        <Skeleton height={44} className="w-full" />
        <Text variant="display" tone="primary">
          display
        </Text>
        <Text variant="title" tone="primary">
          title
        </Text>
        <Text variant="headline" tone="primary">
          headline
        </Text>
        <Text variant="body" tone="primary">
          body
        </Text>
        <Text variant="label" tone="secondary">
          label
        </Text>
        <Text variant="caption" tone="tertiary">
          caption
        </Text>
      </BothThemes>

      <BothThemes title="Inputs">
        <SpeciesToggle value={species} onChange={setSpecies} />
        <PhotoTray uris={[]} max={4} onAdd={() => {}} onRemove={() => {}} onPressPhoto={() => {}} />
        <PhotoTray
          uris={photos}
          max={4}
          onAdd={() => setPhotos((p) => [...p, `${MOCK_PHOTO_URI}#${p.length + 1}`])}
          onRemove={(i) => setPhotos((p) => p.filter((_, index) => index !== i))}
          onPressPhoto={() => {}}
        />
        <DescriptionInput value={description} onChangeText={setDescription} />
        <CheckButton photoCount={0} description="" onPress={() => {}} />
        <CheckButton photoCount={1} description="" onPress={() => {}} />
      </BothThemes>

      <BothThemes title="Verdict banners">
        {MOCK_CASES.map((mockCase) => {
          const payload = mockVerdict(mockCase, language as MockLanguage, t('legal:disclaimer'));
          return (
            <VerdictBanner
              key={mockCase.id}
              verdict={payload.verdict}
              itemName={payload.displayName}
              species={payload.species}
              still
            />
          );
        })}
      </BothThemes>

      <BothThemes title="Verdict cards">
        {MOCK_CASES.map((mockCase) => {
          const payload = mockVerdict(mockCase, language as MockLanguage, t('legal:disclaimer'));
          return (
            <VerdictCard
              key={mockCase.id}
              verdict={payload.verdict}
              itemName={payload.displayName}
              species={payload.species}
              detail={mockCase.note}
            />
          );
        })}
      </BothThemes>

      <BothThemes title="Feedback">
        {VERDICTS.map((verdict) => (
          <SourceCite
            key={verdict}
            verdict={verdict}
            species="dog"
            itemName="Dark chocolate"
            source={{
              label: 'The Merck Veterinary Manual',
              url: 'https://www.merckvetmanual.com/',
            }}
          />
        ))}
        <View className="flex-row gap-2">
          <ConfidencePill band="high" />
          <ConfidencePill band="medium" />
          <ConfidencePill band="low" />
        </View>
        <EmergencyCallButton onPress={openEmergency} />
        <DisclaimerFooter />
        <EmptyState
          title={t('history:emptyTitle')}
          body={t('history:emptyBody')}
          actionLabel={t('history:emptyCta')}
          onAction={() => {}}
        />
        <ErrorState code="SPEND_CAP_EXCEEDED" onRetry={() => {}} onTypeInstead={() => {}} />
      </BothThemes>

      <BothThemes title="Layout">
        <Collapsible title={t('result:sectionSigns')} defaultOpen>
          <Text variant="body" tone="secondary">
            Open by default
          </Text>
        </Collapsible>
        <Collapsible title={t('result:sectionSummary')}>
          <Text variant="body" tone="secondary">
            Collapsed by default
          </Text>
        </Collapsible>
        <Collapsible title={t('result:sectionWhatToDo')} locked>
          <Text variant="body" tone="secondary">
            Locked open — no toggle is rendered
          </Text>
        </Collapsible>
        <Button label="Open sheet" variant="secondary" onPress={() => setSheetOpen(true)} />
      </BothThemes>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('legal:termsTitle')}
        closeLabel={t('common:close')}
      >
        <Text variant="body" tone="secondary">
          {t('legal:disclaimerLong')}
        </Text>
        <Button
          label={t('common:close')}
          variant="secondary"
          onPress={() => setSheetOpen(false)}
          className="mt-4"
        />
      </Sheet>
    </ScrollScreen>
  );
}
