import { getLibraryExercise } from '../../exercises/services/exerciseLibrary';
import type { MuscleGroup } from '../types';
import { CURATED, EQUIPMENT_FILTER, LEVEL_FILTER } from './curated';
import {
  type AutoPlanAnswers,
  type FocusChoice,
  type GeneratedPlanSpec,
  type Objective,
  type SpecDay,
  type SpecExercise,
} from './types';

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  hipertrofia: 'Hipertrofia',
  emagrecimento: 'Emagrecimento',
  forca: 'Força',
  saude: 'Saúde',
};

const FOCUS_GROUPS: Record<FocusChoice, MuscleGroup[]> = {
  peito: ['Peito'],
  costas: ['Costas'],
  ombros: ['Ombros'],
  bracos: ['Bíceps', 'Tríceps'],
  pernas: ['Quadríceps', 'Posterior', 'Glúteos'],
  abdomen: ['Abdômen'],
};

const UPPER: MuscleGroup[] = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'];
const LOWER: MuscleGroup[] = ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Abdômen'];
const PUSH: MuscleGroup[] = ['Peito', 'Ombros', 'Tríceps'];
const PULL: MuscleGroup[] = ['Costas', 'Bíceps', 'Abdômen'];
const LEGS: MuscleGroup[] = ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha'];

const FULL_BODY: MuscleGroup[][] = [
  ['Peito', 'Costas', 'Quadríceps', 'Ombros', 'Abdômen'],
  ['Costas', 'Peito', 'Posterior', 'Bíceps', 'Tríceps'],
  ['Quadríceps', 'Costas', 'Ombros', 'Glúteos', 'Abdômen'],
];

/** Grupos de cada dia, conforme a divisão. Retorna null quando a divisão não cabe nos dias. */
function dayTemplates(split: AutoPlanAnswers['split'], days: number, level: AutoPlanAnswers['level']): MuscleGroup[][] {
  const fullBody = () => Array.from({ length: days }, (_, i) => FULL_BODY[i % FULL_BODY.length]);
  const upperLower = () => Array.from({ length: days }, (_, i) => (i % 2 === 0 ? UPPER : LOWER));

  switch (split) {
    case 'corpo-inteiro':
      return fullBody();
    case 'superior-inferior':
      return upperLower();
    case 'ppl':
      if (days <= 2) return upperLower();
      return {
        3: [PUSH, PULL, LEGS],
        4: [PUSH, PULL, LEGS, UPPER],
        5: [PUSH, PULL, LEGS, UPPER, LOWER],
        6: [PUSH, PULL, LEGS, PUSH, PULL, LEGS],
      }[days] ?? upperLower();
    case 'grupo-por-dia': {
      if (days <= 2) return upperLower();
      const byDays: Record<number, MuscleGroup[][]> = {
        3: [['Peito', 'Tríceps'], ['Costas', 'Bíceps'], ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha']],
        4: [
          ['Peito', 'Tríceps'],
          ['Costas', 'Bíceps'],
          ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha'],
          ['Ombros', 'Abdômen'],
        ],
        5: [
          ['Peito', 'Tríceps'],
          ['Costas', 'Bíceps'],
          ['Quadríceps', 'Panturrilha'],
          ['Ombros', 'Abdômen'],
          ['Posterior', 'Glúteos'],
        ],
        6: [
          ['Peito'],
          ['Costas'],
          ['Quadríceps', 'Panturrilha'],
          ['Ombros', 'Abdômen'],
          ['Bíceps', 'Tríceps'],
          ['Posterior', 'Glúteos'],
        ],
      };
      return byDays[days] ?? upperLower();
    }
    case 'auto':
    default:
      if (days <= 2) return fullBody();
      if (days === 3) return level === 'iniciante' ? fullBody() : dayTemplates('ppl', 3, level);
      if (days === 4) return upperLower();
      return dayTemplates('ppl', days, level);
  }
}

const TOTAL_BY_MINUTES: Record<number, number> = { 45: 5, 60: 6, 75: 7, 90: 8 };
/** Grupos grandes recebem os exercícios extras primeiro. */
const BIG_FIRST: MuscleGroup[] = ['Peito', 'Costas', 'Quadríceps', 'Ombros', 'Posterior', 'Glúteos'];

const SMALL_GROUPS: MuscleGroup[] = ['Panturrilha', 'Abdômen', 'Bíceps', 'Tríceps', 'Glúteos'];

/** Quantos exercícios cada grupo do dia recebe; o total segue o tempo disponível. */
function allocate(groups: MuscleGroup[], total: number, focus: Set<MuscleGroup>): Map<MuscleGroup, number> {
  // Sem espaço para todos: os grupos pequenos do fim da lista ficam de fora.
  const kept = groups.slice(0, Math.max(1, total));
  const result = new Map<MuscleGroup, number>(kept.map((group) => [group, 1]));
  let left = total - kept.length;
  const order = [...kept].sort((a, b) => {
    const score = (g: MuscleGroup) => (focus.has(g) ? 0 : BIG_FIRST.includes(g) ? 1 : 2);
    return score(a) - score(b);
  });
  // Grupos pequenos ficam com 2; só passam disso se sobrar espaço depois.
  for (const extra of [0, 1]) {
    while (left > 0) {
      let placed = false;
      for (const group of order) {
        const base = focus.has(group) ? 4 : SMALL_GROUPS.includes(group) ? 2 : Math.max(3, Math.ceil(total / kept.length));
        if (left > 0 && (result.get(group) ?? 0) < base + extra) {
          result.set(group, (result.get(group) ?? 0) + 1);
          left -= 1;
          placed = true;
        }
      }
      if (!placed) break;
    }
  }
  return result;
}

interface Scheme {
  compound: { sets: number; reps: number; rest: number };
  isolation: { sets: number; reps: number; rest: number };
}

const SCHEMES: Record<Objective, Scheme> = {
  hipertrofia: {
    compound: { sets: 4, reps: 10, rest: 90 },
    isolation: { sets: 3, reps: 12, rest: 60 },
  },
  forca: {
    compound: { sets: 5, reps: 5, rest: 180 },
    isolation: { sets: 3, reps: 10, rest: 90 },
  },
  emagrecimento: {
    compound: { sets: 3, reps: 12, rest: 45 },
    isolation: { sets: 3, reps: 15, rest: 45 },
  },
  saude: {
    compound: { sets: 3, reps: 12, rest: 60 },
    isolation: { sets: 3, reps: 12, rest: 60 },
  },
};

/** Séries, reps e descanso conforme o objetivo; compostos recebem o esquema mais pesado. */
function exerciseFor(
  libraryId: string,
  group: MuscleGroup,
  isCompound: boolean,
  answers: AutoPlanAnswers,
): SpecExercise {
  if (group === 'Cardio') {
    return { libraryId, sets: 1, reps: 10, restSeconds: 0, notes: '10 minutos em ritmo moderado' };
  }
  const scheme = SCHEMES[answers.objective];
  const base = isCompound ? scheme.compound : scheme.isolation;
  const abs = group === 'Abdômen';
  return {
    libraryId,
    sets: answers.level === 'iniciante' ? Math.min(3, base.sets) : base.sets,
    reps: abs ? 15 : group === 'Panturrilha' ? Math.max(base.reps, 15) : base.reps,
    restSeconds: base.rest,
  };
}

interface Candidate {
  id: string;
  compound: boolean;
}

/**
 * Exercícios elegíveis do grupo, na ordem de prioridade: equipamento, nível e limitações. Se o
 * equipamento escolhido deixar o grupo com menos de 2 opções, completa com halteres/barras e depois
 * com qualquer equipamento, e avisa.
 */
function candidates(group: MuscleGroup, answers: AutoPlanAnswers): { list: Candidate[]; relaxed: boolean } {
  const levels: readonly string[] = LEVEL_FILTER[answers.level];
  const usable = CURATED[group].filter(
    (entry) => !entry.avoid.some((limitation) => answers.limitations.includes(limitation)),
  );
  const pick = (allowed: string[]): Candidate[] =>
    usable
      .filter((entry) => {
        const library = getLibraryExercise(entry.id);
        return library !== undefined && levels.includes(library.level) && allowed.includes(library.equipment ?? '');
      })
      .map((entry) => ({ id: entry.id, compound: entry.compound }));

  if (group === 'Cardio') return { list: pick(EQUIPMENT_FILTER.academia), relaxed: false };
  const list = pick(EQUIPMENT_FILTER[answers.equipment]);
  if (list.length >= 2) return { list, relaxed: false };
  for (const wider of [EQUIPMENT_FILTER.livres, EQUIPMENT_FILTER.academia]) {
    for (const item of pick(wider)) {
      if (!list.some((existing) => existing.id === item.id)) list.push(item);
    }
    if (list.length >= 2) break;
  }
  return { list, relaxed: list.length > 0 };
}

export interface GenerateResult {
  spec: GeneratedPlanSpec;
  /** Avisos para a tela de revisão (ex.: faltaram opções para um grupo). */
  notices: string[];
}

function planName(answers: AutoPlanAnswers, now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${OBJECTIVE_LABEL[answers.objective]} ${month}/${now.getFullYear()}`;
}

/** Gerador por regras locais (sem IA, sem internet). */
/** `variation` desloca a escolha dentro de cada lista para "gerar de novo" dar outro plano. */
export function generatePlanLocal(
  answers: AutoPlanAnswers,
  now: Date = new Date(),
  variation = 0,
): GenerateResult {
  const notices: string[] = [];
  const total = TOTAL_BY_MINUTES[answers.minutes] ?? 6;
  const focus = new Set<MuscleGroup>(answers.focus.flatMap((item) => FOCUS_GROUPS[item]));
  const templates = dayTemplates(answers.split, Math.min(6, Math.max(2, answers.days)), answers.level);

  // Cada grupo avança por sua lista a cada aparição, para dias repetidos não repetirem exercícios.
  const cursor = new Map<MuscleGroup, number>();
  const relaxedGroups: MuscleGroup[] = [];
  const cache = new Map<MuscleGroup, Candidate[]>();
  const idsFor = (group: MuscleGroup) => {
    if (!cache.has(group)) {
      const { list, relaxed } = candidates(group, answers);
      if (relaxed) relaxedGroups.push(group);
      cache.set(group, list);
    }
    return cache.get(group) as Candidate[];
  };

  const days: SpecDay[] = templates.map((groups, index) => {
    const exercises: SpecExercise[] = [];
    const used: MuscleGroup[] = [];
    const allocation = allocate(groups, total, focus);

    for (const [group, count] of allocation) {
      const list = idsFor(group);
      if (list.length === 0) {
        notices.push(`Sem exercícios de ${group} para o equipamento escolhido.`);
        continue;
      }
      const start = cursor.get(group) ?? variation * 2;
      const take = Math.min(count, list.length);
      for (let i = 0; i < take; i += 1) {
        exercises.push(exerciseFor(list[(start + i) % list.length].id, group, list[(start + i) % list.length].compound, answers));
      }
      cursor.set(group, start + take);
      used.push(group);
    }

    return { label: String.fromCharCode(65 + index), groups: used, exercises };
  });

  if (answers.cardio !== 'nao') {
    const cardioIds = idsFor('Cardio');
    if (cardioIds.length > 0) {
      if (answers.cardio === 'fim') {
        days.forEach((day, index) => {
          day.exercises.push(exerciseFor(cardioIds[index % cardioIds.length].id, 'Cardio', false, answers));
          day.groups.push('Cardio');
        });
      } else if (days.length < 7) {
        days.push({
          label: String.fromCharCode(65 + days.length),
          groups: ['Cardio'],
          exercises: [0, 1].map((i) => exerciseFor(cardioIds[i % cardioIds.length].id, 'Cardio', false, answers)),
        });
      }
    }
  }

  if (relaxedGroups.length > 0) {
    notices.push(
      `Faltaram opções só com o equipamento escolhido em ${relaxedGroups.join(', ')}; usei também outros equipamentos.`,
    );
  }

  return {
    spec: { name: planName(answers, now), days: days.filter((day) => day.exercises.length > 0) },
    notices: [...new Set(notices)],
  };
}
