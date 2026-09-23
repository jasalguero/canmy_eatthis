import { permissionUiState } from './permissions';

describe('permissionUiState', () => {
  it('is granted when the response says granted', () => {
    expect(permissionUiState({ granted: true, canAskAgain: false })).toBe('granted');
  });

  it('is denied (re-askable) when not granted but the OS will still prompt again', () => {
    expect(permissionUiState({ granted: false, canAskAgain: true })).toBe('denied');
  });

  it('is denied-permanently when not granted and the OS will not prompt again', () => {
    expect(permissionUiState({ granted: false, canAskAgain: false })).toBe('denied-permanently');
  });

  it('treats a missing response (not yet asked) as denied, not granted', () => {
    expect(permissionUiState(null)).toBe('denied');
    expect(permissionUiState(undefined)).toBe('denied');
  });
});
