// The mock module only exports a mock object — it does not register itself as a jest
// mock. `jest.mock(...)` is what actually swaps out the real native module (which throws
// "NativeModule: AsyncStorage is null" under Jest, since there's no native runtime).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
