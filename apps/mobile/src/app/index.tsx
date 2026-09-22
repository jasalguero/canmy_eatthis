import { Text, View } from 'react-native';

/**
 * TEMPORARY theming smoke test — verifies the CSS-variable theme model renders real colours.
 * Replaced by the real Home screen once the design system is built.
 */
export default function Home() {
  return (
    <View className="flex-1 bg-surface-base p-6 gap-4">
      <Text className="text-ink-primary text-title">Theme smoke test</Text>
      <View className="h-20 rounded-lg bg-verdict-safe-bg" />
      <View className="h-20 rounded-lg bg-verdict-caution-bg" />
      <View className="h-20 rounded-lg bg-verdict-toxic-bg" />
      <View className="h-20 rounded-lg bg-verdict-unknown-bg" />
      <View className="h-20 rounded-lg bg-brand-primary" />
      <View className="h-20 rounded-lg bg-surface-raised border border-line-default" />
    </View>
  );
}
