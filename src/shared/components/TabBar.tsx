import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '../theme';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function TabBar<T extends string>({ tabs, value, onChange }: TabBarProps<T>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const selected = tab.value === value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(tab.value)}
              style={[styles.tab, selected && styles.tabSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={selected ? colors.text : colors.textMuted}
              />
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {tab.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.pill,
  },
  tabSelected: {
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  labelSelected: {
    color: colors.text,
  },
});
