import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { DayTabs } from '../components/DayTabs';
import { ExerciseRow } from '../components/ExerciseRow';
import type { Plan } from '../types';
import { buildPlanFromSpec } from './buildPlan';
import { generatePlanLocal } from './generatePlan';
import {
  DEFAULT_ANSWERS,
  QUESTIONS,
  answerLabel,
  applyChoice,
  selectedValues,
} from './questions';
import type { AutoPlanAnswers } from './types';

const HEALTH_KEY = '@beerr/autoplan/healthAck';
const SUMMARY = QUESTIONS.length;

interface AutoPlanFlowProps {
  onSave: (plan: Plan) => void;
  onClose: () => void;
}

interface Generated {
  plan: Plan;
  notices: string[];
}

function generate(answers: AutoPlanAnswers, variation: number): Generated | null {
  const { spec, notices } = generatePlanLocal(answers, new Date(), variation);
  const { plan } = buildPlanFromSpec(spec);
  return plan ? { plan, notices } : null;
}

/** Tela cheia: aviso de saúde, 9 perguntas, resumo e revisão do plano gerado por regras locais. */
export function AutoPlanFlow({ onSave, onClose }: AutoPlanFlowProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [healthAck, setHealthAck] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<AutoPlanAnswers>(DEFAULT_ANSWERS);
  const [touched, setTouched] = useState(false);
  // 0..8 perguntas, 9 resumo, 10 revisão.
  const [step, setStep] = useState(0);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [variation, setVariation] = useState(0);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [failed, setFailed] = useState(false);
  const [planName, setPlanName] = useState('');
  const [dayId, setDayId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HEALTH_KEY)
      .then((value) => setHealthAck(value === '1'))
      .catch(() => setHealthAck(false));
  }, []);

  const confirmHealth = () => {
    AsyncStorage.setItem(HEALTH_KEY, '1').catch(() => undefined);
    setHealthAck(true);
  };

  const requestClose = () => {
    if (!touched || step === 0) {
      onClose();
      return;
    }
    Alert.alert('Descartar respostas?', 'O plano não será criado.', [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onClose },
    ]);
  };

  const goBack = () => {
    if (step === 0) requestClose();
    else if (step === 10) setStep(SUMMARY);
    else setStep(step - 1);
  };

  // O botão voltar do Android volta uma etapa, não fecha tudo.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  });

  const title = step < SUMMARY ? QUESTIONS[step].title : step === SUMMARY ? 'Confira suas respostas' : 'Seu plano';
  useEffect(() => {
    if (healthAck) AccessibilityInfo.announceForAccessibility(title);
  }, [title, healthAck]);

  const startGeneration = (nextVariation: number) => {
    const result = generate(answers, nextVariation);
    setVariation(nextVariation);
    if (!result) {
      setFailed(true);
      setGenerated(null);
      setStep(10);
      return;
    }
    setFailed(false);
    setGenerated(result);
    setPlanName((current) => (nextVariation === 0 || current === '' ? result.plan.name : current));
    setDayId(result.plan.days[0].id);
    setStep(10);
  };

  const choose = (question: (typeof QUESTIONS)[number], value: string) => {
    const before = selectedValues(answers, question);
    // Foco cheio e outra escolha: troca a mais antiga, com uma vibração curta.
    if (question.max && !before.includes(value) && before.length >= question.max && value !== question.exclusive) {
      Vibration.vibrate(15);
    }
    setAnswers((current) => applyChoice(current, question, value));
    setTouched(true);
  };

  const next = () => {
    if (returnToSummary) {
      setReturnToSummary(false);
      setStep(SUMMARY);
    } else {
      setStep(step + 1);
    }
  };

  const day = generated?.plan.days.find((item) => item.id === dayId) ?? generated?.plan.days[0];
  const totalExercises = useMemo(
    () => generated?.plan.days.reduce((sum, item) => sum + item.exercises.length, 0) ?? 0,
    [generated],
  );

  const save = () => {
    if (!generated) return;
    onSave({ ...generated.plan, name: planName.trim() || generated.plan.name });
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={goBack}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.progress} accessibilityLiveRegion="polite">
        {step < SUMMARY ? `Pergunta ${step + 1} de ${SUMMARY}` : step === SUMMARY ? 'Resumo' : 'Revisão'}
      </Text>
      <Pressable
        onPress={requestClose}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>
    </View>
  );

  const footerStyle = [styles.footer, { paddingBottom: insets.bottom + 16 }];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {header}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(Math.min(step, SUMMARY) / SUMMARY) * 100}%` }]} />
      </View>

      {step < SUMMARY && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title} accessibilityRole="header">
              {QUESTIONS[step].title}
            </Text>
            {QUESTIONS[step].help && <Text style={styles.help}>{QUESTIONS[step].help}</Text>}
            {QUESTIONS[step].max && (
              <Text style={styles.counter}>
                {Math.min(answers.focus.length, QUESTIONS[step].max ?? 0)} de {QUESTIONS[step].max} escolhidos
              </Text>
            )}
            {QUESTIONS[step].options.map((option) => {
              const question = QUESTIONS[step];
              const selected = selectedValues(answers, question).includes(option.value);
              const multi = question.kind === 'multi';
              return (
                <Pressable
                  key={option.value}
                  onPress={() => choose(question, option.value)}
                  style={[styles.option, selected && styles.optionSelected]}
                  accessibilityRole={multi ? 'checkbox' : 'radio'}
                  accessibilityState={multi ? { checked: selected } : { selected }}
                  accessibilityLabel={option.hint ? `${option.label}. ${option.hint}` : option.label}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.hint && <Text style={styles.optionHint}>{option.hint}</Text>}
                  </View>
                  <View style={[styles.mark, multi && styles.markSquare, selected && styles.markSelected]}>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={footerStyle}>
            <PrimaryButton label={returnToSummary ? 'Voltar ao resumo' : 'Continuar'} onPress={next} />
          </View>
        </>
      )}

      {step === SUMMARY && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title} accessibilityRole="header">
              Confira suas respostas
            </Text>
            <Text style={styles.help}>Toque numa linha para mudar.</Text>
            {QUESTIONS.map((question, index) => (
              <Pressable
                key={question.key}
                onPress={() => {
                  setReturnToSummary(true);
                  setStep(index);
                }}
                style={styles.summaryRow}
                accessibilityRole="button"
                accessibilityLabel={`${question.short}: ${answerLabel(answers, question)}. Toque para mudar`}
              >
                <Text style={styles.summaryLabel}>{question.short}</Text>
                <Text style={styles.summaryValue}>{answerLabel(answers, question)}</Text>
              </Pressable>
            ))}
            <Text style={styles.disclaimer}>Sugestão automática. Não substitui profissional.</Text>
          </ScrollView>
          <View style={footerStyle}>
            <PrimaryButton label="Gerar plano" onPress={() => startGeneration(0)} />
          </View>
        </>
      )}

      {step === 10 && failed && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
          <Text style={styles.title}>Não foi possível montar o plano</Text>
          <Text style={styles.help}>Tente outras respostas, por exemplo outro equipamento.</Text>
          <PrimaryButton label="Voltar às respostas" onPress={() => setStep(SUMMARY)} style={styles.fullWidth} />
        </View>
      )}

      {step === 10 && generated && day && (
        <>
          <ScrollView contentContainerStyle={styles.reviewContent}>
            <Text style={styles.label}>NOME DO PLANO</Text>
            <TextInput
              style={styles.input}
              value={planName}
              onChangeText={setPlanName}
              maxLength={40}
              returnKeyType="done"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Nome do plano"
            />
            <Text style={styles.reviewSummary}>
              {generated.plan.days.length} treinos · {totalExercises} exercícios
            </Text>
            {generated.notices.map((notice) => (
              <Text key={notice} style={styles.notice}>
                {notice}
              </Text>
            ))}

            <View style={styles.tabs}>
              <DayTabs days={generated.plan.days} activeDayId={day.id} onSelect={setDayId} />
            </View>
            <Text style={styles.targets}>
              {day.muscleGroups.join(' · ')} · {day.exercises.length} exercícios
            </Text>
            {day.exercises.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} onPress={() => undefined} />
            ))}
            <Text style={styles.disclaimer}>
              Sugestão automática. Não substitui profissional. As cargas começam em 0 e são preenchidas pelo seu último treino.
            </Text>
          </ScrollView>
          <View style={footerStyle}>
            <PrimaryButton label="Salvar plano" onPress={save} />
            <Pressable
              onPress={() => startGeneration(variation + 1)}
              style={styles.secondary}
              accessibilityRole="button"
              accessibilityLabel="Gerar outro plano com as mesmas respostas"
            >
              <Ionicons name="refresh" size={20} color={colors.accent} />
              <Text style={styles.secondaryText}>GERAR DE NOVO</Text>
            </Pressable>
          </View>
        </>
      )}

      <BottomSheet visible={healthAck === false} onClose={onClose}>
        <Text style={styles.sheetTitle}>Antes de começar</Text>
        <Text style={styles.sheetText}>
          O plano é uma sugestão automática e não substitui um profissional de educação física ou um médico. Se tiver lesão ou condição de saúde, consulte um antes de treinar.
        </Text>
        <PrimaryButton label="Entendi, continuar" onPress={confirmHealth} style={styles.sheetButton} />
      </BottomSheet>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      minHeight: 56,
    },
    iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    progress: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: fontSize.sm },
    progressTrack: { height: 4, marginHorizontal: 20, borderRadius: 2, backgroundColor: colors.surface },
    progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
    content: { padding: 20, gap: 12 },
    title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34 },
    help: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm },
    counter: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: fontSize.sm },
    option: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    optionSelected: { borderColor: colors.accent },
    optionText: { flex: 1, gap: 2 },
    optionLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: fontSize.md },
    optionHint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm },
    mark: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markSquare: { borderRadius: 6 },
    markSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    footer: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
    summaryRow: {
      minHeight: 56,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      gap: 2,
    },
    summaryLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm },
    summaryValue: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: fontSize.md },
    disclaimer: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm, marginTop: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    fullWidth: { alignSelf: 'stretch', marginTop: 12 },
    reviewContent: { paddingBottom: 24 },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.displayBold,
      fontSize: 16,
      letterSpacing: 0.4,
      marginTop: 16,
      marginBottom: 8,
      marginHorizontal: 20,
    },
    input: {
      minHeight: 48,
      marginHorizontal: 20,
      paddingHorizontal: 16,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
    },
    reviewSummary: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      marginHorizontal: 20,
      marginTop: 8,
    },
    notice: {
      color: colors.accent,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      marginHorizontal: 20,
      marginTop: 6,
    },
    tabs: { marginTop: 16 },
    targets: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      marginHorizontal: 20,
      marginVertical: 12,
    },
    secondary: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryText: {
      color: colors.accent,
      fontFamily: fonts.displayBold,
      fontSize: 18,
      letterSpacing: 0.4,
    },
    sheetTitle: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.lg,
      textAlign: 'center',
      marginBottom: 12,
    },
    sheetText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: 22 },
    sheetButton: { marginTop: 20 },
  });
