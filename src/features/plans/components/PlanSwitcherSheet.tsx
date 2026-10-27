import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { colors, fontSize, fonts, radius } from '../../../shared/theme';
import type { Plan } from '../types';

interface PlanSwitcherSheetProps {
  visible: boolean;
  plans: Plan[];
  activePlanId: string | null;
  onSelect: (planId: string) => void;
  onDelete: (plan: Plan) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function PlanSwitcherSheet({
  visible,
  plans,
  activePlanId,
  onSelect,
  onDelete,
  onCreate,
  onClose,
}: PlanSwitcherSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Meus planos</Text>

      <ScrollView style={styles.list}>
        {plans.map((plan) => {
          const selected = plan.id === activePlanId;
          return (
            <View key={plan.id} style={[styles.row, selected && styles.rowSelected]}>
              <Pressable
                onPress={() => onSelect(plan.id)}
                style={styles.rowMain}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Plano ${plan.name}, ${plan.days.length} dias`}
              >
                <Text style={styles.rowName}>{plan.name}</Text>
                <Text style={styles.rowMeta}>
                  {plan.days.length} {plan.days.length === 1 ? 'dia' : 'dias'} por semana
                </Text>
              </Pressable>
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
        })}
      </ScrollView>

      <PrimaryButton label="Novo plano" onPress={onCreate} style={styles.create} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
    borderColor: colors.primary,
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
