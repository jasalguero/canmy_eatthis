import { getKbEntry, getKbVersion, resolveOffline, suggestOffline } from './offlineKb';

describe('offlineKb — resolution against the bundled asset snapshot', () => {
  it('resolves an exact English alias', () => {
    expect(resolveOffline('dark chocolate')).toEqual({ type: 'exact', kbId: 'chocolate_dark' });
  });

  it('resolves a bare "chocolate" to the more severe entry, in either case', () => {
    expect(resolveOffline('chocolate')).toEqual({ type: 'exact', kbId: 'chocolate_dark' });
    expect(resolveOffline('Chocolate')).toEqual({ type: 'exact', kbId: 'chocolate_dark' });
  });

  it('resolves an exact Spanish alias', () => {
    expect(resolveOffline('cebolla')).toEqual({ type: 'exact', kbId: 'alliums' });
  });

  it('resolves a realistic typo via the fuzzy tier', () => {
    expect(resolveOffline('onyon')).toEqual({ type: 'fuzzy', kbId: 'alliums' });
  });

  it('does not resolve a near-miss or an unrelated word', () => {
    expect(resolveOffline('chocolate lab')).toEqual({ type: 'none', kbId: null });
    expect(resolveOffline('a spatula')).toEqual({ type: 'none', kbId: null });
  });

  it('looks up the resolved entry in the requested language', () => {
    const en = getKbEntry('chocolate_dark', 'en');
    const es = getKbEntry('chocolate_dark', 'es');
    expect(en?.displayName).toBe('Dark chocolate');
    expect(es?.displayName).toBe('Chocolate negro');
  });

  it('returns undefined for an id the bundled KB does not have', () => {
    expect(getKbEntry('not_a_real_id', 'en')).toBeUndefined();
  });

  it('every shipped language has a non-empty KB version', () => {
    expect(getKbVersion('en').length).toBeGreaterThan(0);
    expect(getKbVersion('es').length).toBeGreaterThan(0);
  });
});

describe('suggestOffline', () => {
  it('offers a named entry for a typo that resolveOffline will not guess', () => {
    expect(resolveOffline('onyoin')).toEqual({ type: 'none', kbId: null });
    const suggestions = suggestOffline('onyoin', 'en');
    expect(suggestions.map((s) => s.kbId)).toContain('alliums');
    expect(suggestions.every((s) => s.name.length > 0)).toBe(true);
  });

  it('names the suggestion in the requested language', () => {
    const en = suggestOffline('onyoin', 'en').find((s) => s.kbId === 'alliums');
    const es = suggestOffline('onyoin', 'es').find((s) => s.kbId === 'alliums');
    expect(en?.name).toBeDefined();
    expect(es?.name).toBeDefined();
    expect(es?.name).not.toBe(en?.name);
  });

  it('offers nothing for gibberish', () => {
    expect(suggestOffline('qwerty', 'en')).toEqual([]);
  });
});
