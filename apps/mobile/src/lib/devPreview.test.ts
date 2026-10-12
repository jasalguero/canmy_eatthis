import { devConfirm, devPhotoUri, devResultPayload } from './devPreview';

describe('devPreview in a release build', () => {
  it('gives no mock result, candidates or photo', () => {
    expect(devResultPayload('toxic-severe-cat', 'en', 'disclaimer', false)).toBeNull();
    expect(devConfirm(false, false)).toBeNull();
    expect(devConfirm(true, false)).toBeNull();
    expect(devPhotoUri(false)).toBeNull();
  });
});

describe('devPreview in a development build', () => {
  it('gives the gallery its fixed states', () => {
    expect(devResultPayload('toxic-severe-cat', 'en', 'disclaimer', true)?.verdict).toBe('toxic');
    expect(devResultPayload('no-such-case', 'en', 'disclaimer', true)).toBeNull();
    expect(devConfirm(true, true)?.alternates).toEqual([]);
  });
});
