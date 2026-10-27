import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, fonts, radius } from '../../../shared/theme';
import type { WorkoutSession } from '../types';

const COLLAPSED_EXERCISES = 3;

interface HistoryScreenProps {
  sessions: WorkoutSession[];
  bottomInset: number;
  onDelete: (sessionId: string) => void;
}

function formatDate(iso: string): string {
  const text = new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function durationMinutes(session: WorkoutSession): number {
  const ms = new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

function volumeKg(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((sum, set) => sum + set.reps * set.weight, 0),
    0,
  );
}

export function HistoryScreen({ sessions, bottomInset, onDelete }: HistoryScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Treinos</Text>

      <FlatList
        data={sessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 16 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhum treino concluído ainda. Inicie um treino em “Meu plano” e ele aparece aqui.
          </Text>
        }
        renderItem={({ item }) => <SessionCard session={item} onDelete={onDelete} />}
      />
    </View>
  );
}

function SessionCard({
  session,
  onDelete,
}: {
  session: WorkoutSession;
  onDelete: (sessionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, session.exercises.length - COLLAPSED_EXERCISES);
  const visible = expanded ? session.exercises : session.exercises.slice(0, COLLAPSED_EXERCISES);

  const confirmDelete = () => {
    Alert.alert('Excluir treino', `Excluir o treino de ${formatDate(session.finishedAt)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => onDelete(session.id) },
    ]);
  };

  return (
    <Pressable
      onPress={() => setExpanded((current) => !current)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`Treino de ${formatDate(session.finishedAt)}. Toque para ${expanded ? 'recolher' : 'ver detalhes'}`}
    >
      <Text style={styles.date}>{formatDate(session.finishedAt)}</Text>
      <Text style={styles.plan}>
        {session.dayLabel} · {session.planName}
      </Text>

      <View style={styles.stats}>
        <Stat value={`${durationMinutes(session)} min`} label="DURAÇÃO" />
        <Stat value={String(session.exercises.length)} label="EXERCÍCIOS" />
        <Stat value={`${Math.round(volumeKg(session))} kg`} label="VOLUME" />
      </View>

      {visible.map((exercise) => (
        <View key={exercise.exerciseId} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseSets}>
            {exercise.sets.length} {exercise.sets.length === 1 ? 'série' : 'séries'}
            {' · '}
            {Math.max(...exercise.sets.map((set) => set.weight))} kg
          </Text>
        </View>
      ))}

      {hidden > 0 && !expanded && <Text style={styles.more}>+{hidden} mais</Text>}

      {expanded && (
        <Pressable
          onPress={confirmDelete}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel="Excluir este treino"
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={styles.deleteText}>EXCLUIR TREINO</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xl,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  list: {
    paddingHorizontal: 20,
    gap: 14,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 48,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    gap: 10,
  },
  date: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  plan: {
    color: colors.primary,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    letterSpacing: 0.4,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  exerciseName: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  exerciseSets: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  more: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 4,
  },
  deleteText: {
    color: colors.danger,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.4,
  },
});
