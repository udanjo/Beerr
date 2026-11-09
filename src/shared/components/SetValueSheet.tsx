import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fontSize, fonts, radius, type Palette } from '../theme';
import { useThemedStyles } from '../theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';
import { SegmentedTabs } from './SegmentedTabs';
import { WheelPicker } from './WheelPicker';

export const DEFAULT_REPS = 12;
export const DEFAULT_WEIGHT = 0;

const MAX_REPS = 100;
const MAX_SECONDS = 600;
const SECONDS_STEP = 5;
const MAX_WEIGHT = 300;
const WEIGHT_STEP = 1;

interface SetValueSheetProps {
  title: string;
  /** Aviso curto abaixo do título (ex.: que a mudança vale para as séries seguintes). */
  hint?: string;
  reps: number;
  weight: number;
  /** Exercício por tempo: o primeiro valor são segundos (passo de 5 s), não repetições. */
  timed?: boolean;
  /** Peso por lado (ex.: halter em cada mão) em vez de total; vale para o exercício inteiro. */
  unilateral?: boolean;
  /** Quando informado, mostra o seletor Total / Por lado acima das repetições. */
  onUnilateralChange?: (unilateral: boolean) => void;
  onConfirm: (reps: number, weight: number) => void;
  onClose: () => void;
}

/** Formata com vírgula (padrão brasileiro): 2.5 → "2,5". */
export function formatWeight(value: number): string {
  return String(value).replace('.', ',');
}

function parse(text: string): number {
  return Number(text.replace(',', '.')) || 0;
}

/** Lista de valores da roda; inclui o valor atual mesmo se estiver fora do passo. */
function buildValues(max: number, step: number, start: number, current: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= max; value += step) values.push(value);
  if (!values.includes(current)) values.push(current);
  return values.sort((a, b) => a - b);
}

export function SetValueSheet({
  title,
  hint,
  reps,
  weight,
  timed,
  unilateral = false,
  onUnilateralChange,
  onConfirm,
  onClose,
}: SetValueSheetProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const [side, setSide] = useState(unilateral);
  const [repsValue, setRepsValue] = useState(reps);
  const [weightValue, setWeightValue] = useState(weight);
  const [isTyping, setIsTyping] = useState(false);
  const [repsText, setRepsText] = useState('');
  const [weightText, setWeightText] = useState('');

  const repsValues = useMemo(
    () => (timed ? buildValues(MAX_SECONDS, SECONDS_STEP, SECONDS_STEP, reps) : buildValues(MAX_REPS, 1, 1, reps)),
    [reps, timed],
  );
  const weightValues = useMemo(() => buildValues(MAX_WEIGHT, WEIGHT_STEP, 0, weight), [weight]);

  const startTyping = () => {
    setRepsText(String(repsValue));
    setWeightText(weightValue > 0 ? formatWeight(weightValue) : '');
    setIsTyping(true);
  };

  const handleConfirm = () => {
    if (isTyping) {
      onConfirm(Math.min(timed ? MAX_SECONDS : 999, Math.max(1, Math.round(parse(repsText)))), Math.max(0, parse(weightText)));
    } else {
      onConfirm(repsValue, weightValue);
    }
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={[styles.title, hint ? styles.titleWithHint : null]} numberOfLines={2}>
        {title}
      </Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      {onUnilateralChange && (
        <View style={styles.sideBox}>
          <SegmentedTabs
            options={[
              { value: 'total', label: 'Total' },
              { value: 'side', label: 'Por lado' },
            ]}
            value={side ? 'side' : 'total'}
            onChange={(next) => {
              setSide(next === 'side');
              onUnilateralChange(next === 'side');
            }}
          />
          <Text style={styles.sideHint}>
            Total: peso somado. Por lado: cada halter ou mão. Vale para todas as séries.
          </Text>
        </View>
      )}

      <View style={styles.headers}>
        <Text style={styles.headerText}>{timed ? 'TEMPO (S)' : 'REPS'}</Text>
        <Text style={styles.headerText}>{side ? 'PESO POR LADO (KG)' : 'PESO (KG)'}</Text>
      </View>

      {isTyping ? (
        <View style={styles.typedRow}>
          <TextInput
            style={styles.typedInput}
            value={repsText}
            onChangeText={setRepsText}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
            accessibilityLabel={timed ? 'Segundos' : 'Repetições'}
          />
          <TextInput
            style={styles.typedInput}
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            maxLength={6}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
            accessibilityLabel="Peso em quilos"
          />
        </View>
      ) : (
        <View style={styles.wheels}>
          <WheelPicker
            label={timed ? 'Segundos' : 'Repetições'}
            values={repsValues}
            value={repsValue}
            onChange={setRepsValue}
          />
          <WheelPicker
            label="Peso em quilos"
            values={weightValues}
            value={weightValue}
            onChange={setWeightValue}
            format={formatWeight}
          />
        </View>
      )}

      <Pressable
        onPress={isTyping ? () => setIsTyping(false) : startTyping}
        style={styles.toggle}
        accessibilityRole="button"
      >
        <Text style={styles.toggleText}>{isTyping ? 'USAR ROLAGEM' : 'DIGITAR VALOR'}</Text>
      </Pressable>

      <PrimaryButton label="Salvar" onPress={handleConfirm} />
    </BottomSheet>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  titleWithHint: {
    marginBottom: 2,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: 12,
  },
  sideBox: {
    marginBottom: 12,
    gap: 6,
  },
  sideHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  headers: {
    flexDirection: 'row',
  },
  headerText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    textAlign: 'center',
  },
  wheels: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  typedRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  typedInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  toggle: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  });
