import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { WheelPicker } from '../../../shared/components/WheelPicker';
import { fontSize, fonts, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { dateKeyFromToday, toDateKey } from '../services/planExpiry';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DEFAULT_WEEKS = 8;

interface ExpirySheetProps {
  visible: boolean;
  /** Prazo atual (AAAA-MM-DD); ausente = sem prazo. */
  value?: string;
  title?: string;
  onConfirm: (expiresAt: string | undefined) => void;
  onClose: () => void;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function ExpirySheet({ visible, value, title = 'Prazo do plano', onConfirm, onClose }: ExpirySheetProps) {
  const { styles } = useThemedStyles(makeStyles);
  const today = new Date();
  const initial = value ?? dateKeyFromToday(DEFAULT_WEEKS * 7);
  const [year, setYear] = useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(Number(initial.slice(5, 7)));
  const [day, setDay] = useState(Number(initial.slice(8, 10)));

  const years = Array.from({ length: 4 }, (_, index) => today.getFullYear() + index);
  if (!years.includes(year)) years.unshift(year);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1);
  const safeDay = Math.min(day, days.length);

  const key = toDateKey(new Date(year, month - 1, safeDay));
  const isPast = key < toDateKey(today);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.wheels}>
        <WheelPicker label="Dia" values={days} value={safeDay} onChange={setDay} />
        <WheelPicker
          label="Mês"
          values={MONTHS.map((_, index) => index + 1)}
          value={month}
          onChange={setMonth}
          format={(item) => MONTHS[item - 1]}
        />
        <WheelPicker label="Ano" values={years} value={year} onChange={setYear} />
      </View>

      {isPast && <Text style={styles.error}>Escolha uma data a partir de hoje.</Text>}

      <PrimaryButton
        label="Salvar prazo"
        onPress={() => onConfirm(key)}
        disabled={isPast}
        style={styles.save}
      />
      {value !== undefined && (
        <Pressable
          onPress={() => onConfirm(undefined)}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel="Remover prazo"
        >
          <Text style={styles.removeText}>Remover prazo</Text>
        </Pressable>
      )}
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
    marginBottom: 8,
  },
  wheels: {
    flexDirection: 'row',
    gap: 8,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: 8,
  },
  save: {
    marginTop: 12,
  },
  remove: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  });
