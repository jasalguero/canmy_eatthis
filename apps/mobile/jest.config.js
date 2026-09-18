/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Deliberately NOT overriding transformIgnorePatterns: jest-expo's preset (built on
  // @react-native/jest-preset) already ships a transformIgnorePatterns that covers the
  // whole RN/Expo ecosystem, including scoped packages like @react-native/js-polyfills.
  // A hand-written pattern here fully replaces the preset's (Jest doesn't merge project
  // config into preset config for this key) and silently stops transforming any package
  // it doesn't enumerate — which is exactly what broke @react-native/js-polyfills.
};
