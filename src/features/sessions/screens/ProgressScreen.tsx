import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import {
  EMPTY_TOTALS,
  addDays,
  dayKey,
  setsByGroup,
  startOfWeek,
  totalsByDay,
  weekDays,
  weeklyStreak,
  type DayTotals,
} from '../services/progressStats';
import type { WorkoutSession } from '../types';

type Metric = 'minutes' | 'volume' | 'sets';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'minutes', label: 'Tempo' },
  { value: 'volume', label: 'Volume' },
  { value: 'sets', label: 'Séries' },
];

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const CHART_HEIGHT = 120;
const MIN_BAR = 4;
const GROUPS_COLLAPSED = 5;

interface ProgressScreenProps {
  sessions: WorkoutSession[];
  bottomInset: number;
}

function formatDay(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 60)}h${String(rest).padStart(2, '0')}`;
}

function formatVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString('pt-BR')} kg`;
}

/** Texto curto para cima da barra. */
function formatBarValue(metric: Metric, value: number): string {
  if (value <= 0) return '';
  if (metric === 'volume') {
    return value >= 1000 ? `${(value / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(value));
  }
  return String(Math.round(value));
}

function formatTotal(metric: Metric, value: number): string {
  if (metric === 'minutes') return formatMinutes(value);
  if (metric === 'volume') return formatVolume(value);
  return `${value} ${value === 1 ? 'série' : 'séries'}`;
}

function describeBar(metric: Metric, dayName: string, value: number): string {
  if (value <= 0) return `${dayName}, sem treino`;
  return `${dayName}, ${formatTotal(metric, value)}`;
}

export function ProgressScreen({ sessions, bottomInset }: ProgressScreenProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const [metric, setMetric] = useState<Metric>('minutes');
  const [showAllGroups, setShowAllGroups] = useState(false);

  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);

  const totals = useMemo(() => totalsByDay(sessions), [sessions]);
  const trainedDays = useMemo(() => new Set(totals.keys()), [totals]);
  const days = weekDays(weekStart, today);
  const streak = weeklyStreak(trainedDays, today);

  const dayTotals: DayTotals[] = days.map((day) => totals.get(day.key) ?? EMPTY_TOTALS);
  const values = dayTotals.map((item) => item[metric]);
  const weekTotal = values.reduce((sum, value) => sum + value, 0);
  const maxValue = Math.max(...values, 0);
  const trainedCount = dayTotals.filter((item) => item.sets > 0).length;

  const groups = useMemo(() => setsByGroup(sessions, weekStart), [sessions, weekStart.getTime()]);
  const visibleGroups = showAllGroups ? groups : groups.slice(0, GROUPS_COLLAPSED);
  const maxGroup = groups.length > 0 ? groups[0][1] : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Progresso</Text>

      {sessions.length === 0 ? (
        <Text style={styles.empty}>
          Nenhum treino concluído ainda. Termine um treino em “Meu plano” e seu progresso aparece aqui.
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.weekNav}>
            <Pressable
              onPress={() => setWeekOffset((current) => current - 1)}
              style={styles.navButton}
              accessibilityRole="button"
              accessibilityLabel="Semana anterior"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.weekRange}>
              {weekOffset === 0 ? 'Esta semana · ' : ''}
              {formatDay(weekStart)} – {formatDay(weekEnd)}
            </Text>
            <Pressable
              onPress={() => setWeekOffset((current) => Math.min(0, current + 1))}
              disabled={weekOffset === 0}
              style={[styles.navButton, weekOffset === 0 && styles.navDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: weekOffset === 0 }}
              accessibilityLabel="Próxima semana"
            >
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekStrip}>
            {days.map((day, index) => {
              const minutes = dayTotals[index].minutes;
              const trained = dayTotals[index].sets > 0;
              return (
                <View
                  key={day.key}
                  style={styles.dayCell}
                  accessibilityLabel={`${WEEKDAY_NAMES[index]} ${day.date.getDate()}, ${
                    trained ? `treinou ${formatMinutes(minutes)}` : 'sem treino'
                  }`}
                >
                  <Text style={[styles.dayName, day.isToday && styles.dayNameToday]}>
                    {WEEKDAY_LABELS[index]}
                  </Text>
                  <View
                    style={[
                      styles.dayCircle,
                      trained && styles.dayCircleTrained,
                      day.isToday && !trained && styles.dayCircleToday,
                    ]}
                  >
                    {trained ? (
                      <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                    ) : (
                      <Text style={[styles.dayNumber, day.isFuture && styles.dayFuture]}>
                        {day.date.getDate()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.dayMinutes}>{trained ? `${minutes}min` : ' '}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryValue}>{formatTotal(metric, weekTotal)}</Text>
                <Text style={styles.summaryLabel}>Total da semana</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryValue}>{trainedCount}</Text>
                <Text style={styles.summaryLabel}>
                  {trainedCount === 1 ? 'dia treinado' : 'dias treinados'}
                </Text>
              </View>
            </View>

            <View style={styles.chart}>
              {days.map((day, index) => {
                const value = values[index];
                const height = value > 0 ? Math.max(MIN_BAR, (value / maxValue) * CHART_HEIGHT) : 0;
                return (
                  <View
                    key={day.key}
                    style={styles.barColumn}
                    accessibilityLabel={describeBar(metric, WEEKDAY_NAMES[index], value)}
                  >
                    <Text style={styles.barValue} numberOfLines={1}>
                      {formatBarValue(metric, value)}
                    </Text>
                    <View style={styles.barArea}>
                      <View style={[styles.bar, { height }, day.isToday && styles.barToday]} />
                    </View>
                    <Text style={[styles.barLabel, day.isToday && styles.barLabelToday]}>
                      {WEEKDAY_LABELS[index].charAt(0)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {weekTotal === 0 && <Text style={styles.noTraining}>Sem treinos nesta semana</Text>}

            <SegmentedTabs options={METRICS} value={metric} onChange={setMetric} />
          </View>

          {groups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SÉRIES POR GRUPO MUSCULAR</Text>
              {visibleGroups.map(([group, count]) => (
                <View
                  key={group}
                  style={styles.groupRow}
                  accessibilityLabel={`${group}, ${count} ${count === 1 ? 'série' : 'séries'}`}
                >
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group}
                  </Text>
                  <View style={styles.groupTrack}>
                    <View style={[styles.groupFill, { width: `${(count / maxGroup) * 100}%` }]} />
                  </View>
                  <Text style={styles.groupCount}>{count}</Text>
                </View>
              ))}
              {groups.length > GROUPS_COLLAPSED && (
                <Pressable
                  onPress={() => setShowAllGroups((current) => !current)}
                  style={styles.moreButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.moreText}>{showAllGroups ? 'VER MENOS' : 'VER TODOS'}</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.streakCard}>
            <Ionicons name="flame" size={26} color={colors.accent} />
            <View>
              <Text style={styles.summaryValue}>{streak}</Text>
              <Text style={styles.summaryLabel}>
                {streak === 1 ? 'semana seguida treinando' : 'semanas seguidas treinando'}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xl,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  navDisabled: {
    opacity: 0.35,
  },
  weekRange: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dayName: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  dayNameToday: {
    color: colors.text,
  },
  dayCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCircleTrained: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },
  dayCircleToday: {
    borderColor: colors.accent,
  },
  dayNumber: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
  },
  dayFuture: {
    color: colors.textMuted,
  },
  dayMinutes: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
  },
  card: {
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xl,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  chart: {
    flexDirection: 'row',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValue: {
    height: 16,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
  },
  barArea: {
    height: CHART_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    minWidth: 18,
    borderRadius: 6,
    backgroundColor: colors.textMuted,
  },
  barToday: {
    backgroundColor: colors.primary,
  },
  barLabel: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  barLabelToday: {
    color: colors.text,
  },
  noTraining: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  groupName: {
    width: 96,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
  },
  groupTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  groupFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  groupCount: {
    width: 28,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    textAlign: 'right',
  },
  moreButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  });
