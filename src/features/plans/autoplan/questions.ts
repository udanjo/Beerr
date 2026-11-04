import type { AutoPlanAnswers } from './types';

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface Question {
  key: keyof AutoPlanAnswers;
  /** Rótulo curto para o resumo. */
  short: string;
  title: string;
  help?: string;
  /** 'multi' aceita várias opções; `exclusive` é a opção que limpa as outras. */
  kind: 'single' | 'multi';
  exclusive?: string;
  max?: number;
  options: QuestionOption[];
}

export const EQUILIBRADO = 'equilibrado';
export const NENHUMA = 'nenhuma';

export const QUESTIONS: Question[] = [
  {
    key: 'objective',
    short: 'Objetivo',
    title: 'Qual é o seu objetivo?',
    kind: 'single',
    options: [
      { value: 'hipertrofia', label: 'Ganhar massa muscular' },
      { value: 'emagrecimento', label: 'Emagrecer e ganhar condicionamento' },
      { value: 'forca', label: 'Ficar mais forte' },
      { value: 'saude', label: 'Saúde e manutenção' },
    ],
  },
  {
    key: 'level',
    short: 'Nível',
    title: 'Há quanto tempo você treina?',
    kind: 'single',
    options: [
      { value: 'iniciante', label: 'Iniciante', hint: 'Menos de 6 meses' },
      { value: 'intermediario', label: 'Intermediário', hint: '6 meses a 2 anos' },
      { value: 'avancado', label: 'Avançado', hint: 'Mais de 2 anos' },
    ],
  },
  {
    key: 'days',
    short: 'Dias por semana',
    title: 'Quantos dias por semana você quer treinar?',
    kind: 'single',
    options: [2, 3, 4, 5, 6].map((days) => ({ value: String(days), label: `${days} dias` })),
  },
  {
    key: 'minutes',
    short: 'Tempo por treino',
    title: 'Quanto tempo você tem por treino?',
    kind: 'single',
    options: [
      { value: '45', label: 'Até 45 minutos' },
      { value: '60', label: 'Cerca de 60 minutos' },
      { value: '75', label: 'Cerca de 75 minutos' },
      { value: '90', label: '90 minutos ou mais' },
    ],
  },
  {
    key: 'equipment',
    short: 'Equipamento',
    title: 'Onde e com o que você vai treinar?',
    kind: 'single',
    options: [
      { value: 'academia', label: 'Academia completa' },
      { value: 'livres', label: 'Halteres e barras livres' },
      { value: 'maquinas', label: 'Máquinas e polias' },
      { value: 'corpo', label: 'Peso do corpo', hint: 'Poucas opções: o plano pode usar outros equipamentos' },
    ],
  },
  {
    key: 'focus',
    short: 'Foco',
    title: 'Quer dar mais atenção a algum grupo?',
    help: 'Escolha até 2.',
    kind: 'multi',
    exclusive: EQUILIBRADO,
    max: 2,
    options: [
      { value: EQUILIBRADO, label: 'Equilibrado' },
      { value: 'peito', label: 'Peito' },
      { value: 'costas', label: 'Costas' },
      { value: 'ombros', label: 'Ombros' },
      { value: 'bracos', label: 'Braços' },
      { value: 'pernas', label: 'Pernas e glúteos' },
      { value: 'abdomen', label: 'Abdômen' },
    ],
  },
  {
    key: 'split',
    short: 'Divisão',
    title: 'Como prefere dividir os treinos?',
    kind: 'single',
    options: [
      { value: 'auto', label: 'Deixar o app decidir' },
      { value: 'corpo-inteiro', label: 'Corpo inteiro em cada treino' },
      { value: 'superior-inferior', label: 'Superior e inferior' },
      { value: 'ppl', label: 'Empurrar, puxar e pernas' },
      { value: 'grupo-por-dia', label: 'Poucos grupos por dia' },
    ],
  },
  {
    key: 'limitations',
    short: 'Limitações',
    title: 'Tem alguma limitação?',
    help: 'O plano evita exercícios que mais pesam nessa região. Não substitui orientação profissional.',
    kind: 'multi',
    exclusive: NENHUMA,
    options: [
      { value: NENHUMA, label: 'Nenhuma' },
      { value: 'joelho', label: 'Joelho' },
      { value: 'ombro', label: 'Ombro' },
      { value: 'lombar', label: 'Lombar' },
      { value: 'punho', label: 'Punho' },
    ],
  },
  {
    key: 'cardio',
    short: 'Cardio',
    title: 'Quer incluir cardio?',
    kind: 'single',
    options: [
      { value: 'nao', label: 'Não' },
      { value: 'fim', label: '10 minutos no fim de cada treino' },
      { value: 'dia', label: 'Um dia só de cardio' },
    ],
  },
];

export const DEFAULT_ANSWERS: AutoPlanAnswers = {
  objective: 'hipertrofia',
  level: 'intermediario',
  days: 4,
  minutes: 60,
  equipment: 'academia',
  focus: [],
  split: 'auto',
  limitations: [],
  cardio: 'nao',
};

/** Valores selecionados (como texto) de uma resposta, para a tela de pergunta. */
export function selectedValues(answers: AutoPlanAnswers, question: Question): string[] {
  const value = answers[question.key];
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String) : [question.exclusive ?? ''];
  }
  return [String(value)];
}

export function answerLabel(answers: AutoPlanAnswers, question: Question): string {
  const selected = selectedValues(answers, question);
  return question.options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)
    .join(', ');
}

/** Aplica um toque numa opção e devolve as respostas novas (regras de única, múltipla e exclusiva). */
export function applyChoice(
  answers: AutoPlanAnswers,
  question: Question,
  value: string,
): AutoPlanAnswers {
  if (question.kind === 'single') {
    const parsed = question.key === 'days' || question.key === 'minutes' ? Number(value) : value;
    return { ...answers, [question.key]: parsed };
  }
  const current = (answers[question.key] as string[]).slice();
  if (value === question.exclusive) return { ...answers, [question.key]: [] };
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  // Passou do limite: sai a escolha mais antiga.
  const limited = question.max && next.length > question.max ? next.slice(next.length - question.max) : next;
  return { ...answers, [question.key]: limited };
}
