import { devConfirm, devHistoryRows, devPhotoUri, devResultPayload } from './devPreview';

describe('devPreview in a release build', () => {
  it('gives no mock result, candidates, photo or history', () => {
    expect(devResultPayload('toxic-severe-cat', 'en', 'disclaimer', false)).toBeNull();
    expect(devConfirm(false, false)).toBeNull();
    expect(devConfirm(true, false)).toBeNull();
    expect(devPhotoUri(false)).toBeNull();
    expect(devHistoryRows('en', 'disclaimer', false)).toEqual([]);
  });
});

describe('devPreview in a development build', () => {
  it('gives the gallery its fixed states', () => {
    expect(devResultPayload('toxic-severe-cat', 'en', 'disclaimer', true)?.verdict).toBe('toxic');
    expect(devResultPayload('no-such-case', 'en', 'disclaimer', true)).toBeNull();
    expect(devConfirm(true, true)?.alternates).toEqual([]);
    expect(devHistoryRows('es', 'aviso', true).length).toBeGreaterThan(0);
  });
});
