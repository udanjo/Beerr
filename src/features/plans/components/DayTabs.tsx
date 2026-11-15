import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, type ScrollViewInstance } from 'react-native';

import { fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { displayDayLabel, MAX_DAYS, type PlanDay } from '../types';

interface DayTabsProps {
  days: PlanDay[];
  activeDayId: string;
  /** Dias já feitos no ciclo atual (ganham um check); continuam tocáveis. */
  doneIds?: Set<string>;
  /** Próximo dia sugerido (contorno discreto). */
  nextId?: string;
  onSelect: (dayId: string) => void;
  /** Quando informado, mostra o botão "+" para criar um novo treino. */
  onAdd?: () => void;
}

export function DayTabs({ days, activeDayId, doneIds, nextId, onSelect, onAdd }: DayTabsProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const previousCount = useRef(days.length);

  // Ao criar um treino, rola até o fim para ele (e o "+") ficarem à vista.
  useEffect(() => {
    if (days.length > previousCount.current) scrollRef.current?.scrollToEnd({ animated: true });
    previousCount.current = days.length;
  }, [days.length]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
    >
      {days.map((day) => {
        const selected = day.id === activeDayId;
        const done = doneIds?.has(day.id) ?? false;
        const next = day.id === nextId && !done && (doneIds?.size ?? 0) > 0;
        return (
          <Pressable
            key={day.id}
            onPress={() => onSelect(day.id)}
            style={[
              styles.tab,
              selected && styles.tabSelected,
              next && styles.tabNext,
              (done || next) && styles.tabWithIcon,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Treino ${displayDayLabel(day.label)}${
              done ? ', feito neste ciclo' : next ? ', próximo' : ''
            }`}
          >
            {done && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.accent}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}
            {next && (
              <Ionicons
                name="ellipse-outline"
                size={16}
                color={colors.accent}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}
            <Text
              style={[styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {displayDayLabel(day.label).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
      {onAdd && days.length < MAX_DAYS && (
        <Pressable
          onPress={onAdd}
          style={styles.addTab}
          accessibilityRole="button"
          accessibilityLabel="Novo treino"
        >
          <Ionicons name="add" size={22} color={colors.accent} />
          <Text style={styles.addLabel}>NOVO</Text>
        </Pressable>
      )}
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
    maxWidth: 180,
    minHeight: 44,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabNext: {
    borderColor: colors.accent,
  },
  // Com ícone, menos padding para a aba não "pular" de largura ao concluir um dia.
  tabWithIcon: {
    paddingHorizontal: 14,
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
  addTab: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },
  addLabel: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  });
