import { describe, expect, it } from 'vitest';
import { HOTLINES, hotlinesForRegion } from './hotlines.js';

describe('hotline registry', () => {
  it('has unique ids and numbers', () => {
    expect(new Set(HOTLINES.map((h) => h.id)).size).toBe(HOTLINES.length);
    expect(new Set(HOTLINES.map((h) => h.phone)).size).toBe(HOTLINES.length);
  });

  it('shows the same digits it dials', () => {
    // A display string that drifted from the E.164 number would show one number and call another.
    for (const h of HOTLINES) {
      const displayDigits = h.display.replace(/\D/g, '').replace(/^0/, '');
      expect(h.phone.endsWith(displayDigits), h.id).toBe(true);
    }
  });

  // docs/03, docs/05 §3: a number reaches a release build only after a person has dialled it.
  it('leaves unverified lines out unless asked for them', () => {
    const unverified = HOTLINES.filter((h) => h.verifiedAt === null);
    for (const h of unverified) {
      for (const region of h.regions) {
        expect(hotlinesForRegion(region).map((x) => x.id)).not.toContain(h.id);
        expect(hotlinesForRegion(region, { includeUnverified: true }).map((x) => x.id)).toContain(
          h.id,
        );
      }
    }
  });

  it('never offers the US toll-free lines outside the US', () => {
    for (const region of ['ES', 'GB', 'MX', 'AR']) {
      const ids = hotlinesForRegion(region, { includeUnverified: true }).map((h) => h.id);
      expect(ids).not.toContain('aspca_apcc_us');
      expect(ids).not.toContain('pet_poison_helpline_us');
    }
  });

  it('has nothing for a region without a confirmed line, rather than a guess', () => {
    expect(hotlinesForRegion('MX', { includeUnverified: true })).toEqual([]);
    expect(hotlinesForRegion('AR', { includeUnverified: true })).toEqual([]);
  });
});
