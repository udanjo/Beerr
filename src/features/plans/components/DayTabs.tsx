import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { displayDayLabel, type PlanDay } from '../types';

interface DayTabsProps {
  days: PlanDay[];
  activeDayId: string;
  onSelect: (dayId: string) => void;
}

export function DayTabs({ days, activeDayId, onSelect }: DayTabsProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
    >
      {days.map((day) => {
        const selected = day.id === activeDayId;
        return (
          <Pressable
            key={day.id}
            onPress={() => onSelect(day.id)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Treino ${displayDayLabel(day.label)}`}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {displayDayLabel(day.label).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  content: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    minWidth: 80,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  tabSelected: {
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  labelSelected: {
    color: colors.text,
  },
  });
