import { HOTLINES } from '@canmyeatthis/shared';
import { Linking } from 'react-native';

import { en, es } from '@/i18n';
import { callHotline, emergencyHotlines, findEmergencyVetUrl } from './emergency';

describe('emergencyHotlines', () => {
  // docs/05 §3: a number reaches a release only after a person has dialled it.
  it('shows no unverified line in a release build', () => {
    for (const region of ['ES', 'GB', 'US', 'MX', 'AR']) {
      for (const hotline of emergencyHotlines(region, false)) {
        expect(hotline.verifiedAt).not.toBeNull();
      }
    }
  });

  // AGENTS.md #4: the emergency path must work in a release build. A release that shows no numbers
  // for a region we cover would be the worst version of this screen, so un-verifying a line (or
  // dropping one) has to fail here and not on a user's phone.
  it('offers at least one verified line in a release build for every region that has a registry entry', () => {
    for (const region of ['ES', 'GB', 'US']) {
      expect(emergencyHotlines(region, false).length).toBeGreaterThan(0);
    }
    expect(emergencyHotlines('US', false).map((h) => h.id)).toEqual([
      'aspca_apcc_us',
      'pet_poison_helpline_us',
    ]);
  });

  it('shows unverified lines in a development build, for testing', () => {
    expect(emergencyHotlines('ES', true).map((h) => h.id)).toEqual(['sit_intcf_es']);
    expect(emergencyHotlines('US', true).map((h) => h.id)).toEqual([
      'aspca_apcc_us',
      'pet_poison_helpline_us',
    ]);
  });

  // AGENTS.md #12: region picks the numbers; language never does.
  it('depends on region only', () => {
    expect(emergencyHotlines('GB', true).map((h) => h.id)).toEqual(['animal_poisonline_gb']);
  });
});

describe('callHotline', () => {
  it('dials the E.164 number', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const [sit] = emergencyHotlines('ES', true);
    callHotline(sit);
    expect(open).toHaveBeenCalledWith('tel:+34915620420');
    open.mockRestore();
  });
});

describe('findEmergencyVetUrl', () => {
  it('builds an encoded maps search', () => {
    expect(findEmergencyVetUrl('veterinario de urgencias')).toBe(
      'https://www.google.com/maps/search/?api=1&query=veterinario%20de%20urgencias',
    );
  });
});

describe('hotline copy', () => {
  // A fee must be stated, never left blank (docs/05 §3), in every shipped language.
  it.each([
    ['en', en.hotlines],
    ['es', es.hotlines],
  ])('%s states every fee and names every language', (_lang, catalogue) => {
    const strings = catalogue as Record<string, string>;
    for (const hotline of HOTLINES) {
      if (hotline.cost === 'fee') expect(strings[`fee_${hotline.id}`]).toBeTruthy();
      else expect(strings[`cost_${hotline.cost}`]).toBeTruthy();
      for (const code of hotline.languages) expect(strings[`language_${code}`]).toBeTruthy();
    }
  });
});
