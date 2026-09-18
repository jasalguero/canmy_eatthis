import { useSettingsStore } from './settings';

describe('useSettingsStore — language and region independence (AGENTS.md #12)', () => {
  it('setLanguage changes language and leaves region untouched', () => {
    const regionBefore = useSettingsStore.getState().region;
    useSettingsStore.getState().setLanguage('es');
    const after = useSettingsStore.getState();
    expect(after.language).toBe('es');
    expect(after.region).toBe(regionBefore);
  });

  it('setRegion changes region and leaves language untouched', () => {
    const languageBefore = useSettingsStore.getState().language;
    useSettingsStore.getState().setRegion('MX');
    const after = useSettingsStore.getState();
    expect(after.region).toBe('MX');
    expect(after.language).toBe(languageBefore);
  });

  it('setLanguage back to en still leaves whatever region was set', () => {
    useSettingsStore.getState().setRegion('AR');
    useSettingsStore.getState().setLanguage('en');
    const after = useSettingsStore.getState();
    expect(after.language).toBe('en');
    expect(after.region).toBe('AR');
  });
});
