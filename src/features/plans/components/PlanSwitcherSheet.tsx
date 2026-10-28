import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { expiryText, isExpired, isExpiringSoon } from '../services/planExpiry';
import type { Plan } from '../types';

interface PlanSwitcherSheetProps {
  visible: boolean;
  plans: Plan[];
  activePlanId: string | null;
  onSelect: (planId: string) => void;
  onDelete: (plan: Plan) => void;
  onRenew: (plan: Plan) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function PlanSwitcherSheet({
  visible,
  plans,
  activePlanId,
  onSelect,
  onDelete,
  onRenew,
  onCreate,
  onClose,
}: PlanSwitcherSheetProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const [showExpired, setShowExpired] = useState(false);
  const now = new Date();
  const current = plans.filter((plan) => !isExpired(plan, now));
  const expired = plans.filter((plan) => isExpired(plan, now));

  const renderRow = (plan: Plan) => {
    const selected = plan.id === activePlanId;
    const isOld = isExpired(plan, now);
    const expiry = expiryText(plan, now);
    const meta = `${plan.days.length} ${plan.days.length === 1 ? 'treino' : 'treinos'}`;
    return (
      <View key={plan.id} style={[styles.row, selected && styles.rowSelected]}>
        <Pressable
          onPress={() => onSelect(plan.id)}
          style={styles.rowMain}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`Plano ${plan.name}, ${meta}${expiry ? `, ${expiry}` : ''}`}
        >
          <Text style={styles.rowName}>{plan.name}</Text>
          <Text style={styles.rowMeta}>
            {meta}
            {expiry ? ' · ' : ''}
            {expiry ? (
              <Text
                style={isOld ? styles.metaExpired : isExpiringSoon(plan, now) ? styles.metaSoon : undefined}
              >
                {expiry}
              </Text>
            ) : null}
          </Text>
        </Pressable>
        {isOld && (
          <Pressable
            onPress={() => onRenew(plan)}
            style={styles.renewButton}
            accessibilityRole="button"
            accessibilityLabel={`Renovar plano ${plan.name}`}
          >
            <Text style={styles.renewText}>Renovar</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => onDelete(plan)}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel={`Excluir plano ${plan.name}`}
        >
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Meus planos</Text>

      <ScrollView style={styles.list}>
        {current.map((plan) => renderRow(plan))}

        {expired.length > 0 && (
          <>
            <Pressable
              onPress={() => setShowExpired((open) => !open)}
              style={styles.expiredHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded: showExpired }}
            >
              <Text style={styles.expiredTitle}>Vencidos ({expired.length})</Text>
              <Ionicons
                name={showExpired ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            {showExpired && expired.map((plan) => renderRow(plan))}
          </>
        )}
      </ScrollView>

      <PrimaryButton label="Novo plano" onPress={onCreate} style={styles.create} />
    </BottomSheet>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: {
    borderColor: colors.accent,
  },
  rowMain: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  rowName: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  rowMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  metaExpired: {
    color: colors.danger,
  },
  metaSoon: {
    color: colors.accent,
  },
  expiredHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  expiredTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
  },
  renewButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  renewText: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
  },
  deleteButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  create: {
    marginTop: 8,
  },
  });
