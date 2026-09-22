module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      // NativeWind v4 (docs/02-tech-decisions.md D4): Tailwind semantics over StyleSheet.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-reanimated v4 (docs/06-ui-design-system.md §1 Motion): the worklet
    // plugin must be listed last.
    plugins: ['react-native-reanimated/plugin'],
  };
};
