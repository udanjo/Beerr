import type { MuscleGroup } from '../types';
import type { EquipmentChoice, Limitation } from './types';

/**
 * Exercícios principais por grupo, em ordem de prioridade (a ordem alterna tipos: primeiro um
 * composto, depois outro ângulo, depois um isolador). Só ids da biblioteca. A letra depois do
 * "|" marca quem deve ficar de fora quando a pessoa tem limitação:
 * j = joelho, o = ombro, l = lombar, p = punho; c = composto.
 */
const RAW: Record<MuscleGroup, string[]> = {
  Peito: [
    'Barbell_Bench_Press_-_Medium_Grip|opc',
    'Incline_Dumbbell_Press|oc',
    'Machine_Bench_Press|c',
    'Cable_Crossover|o',
    'Dumbbell_Bench_Press|oc',
    'Leverage_Incline_Chest_Press|c',
    'Dumbbell_Flyes|o',
    'Barbell_Incline_Bench_Press_-_Medium_Grip|opc',
    'Smith_Machine_Bench_Press|oc',
    'Butterfly|',
    'Pushups|opc',
    'Cable_Chest_Press|c',
    'Incline_Dumbbell_Flyes|o',
    'Incline_Push-Up|p',
  ],
  Costas: [
    'Wide-Grip_Lat_Pulldown|c',
    'Seated_Cable_Rows|c',
    'One-Arm_Dumbbell_Row|c',
    'Bent_Over_Barbell_Row|lc',
    'Close-Grip_Front_Lat_Pulldown|c',
    'Leverage_High_Row|c',
    'Straight-Arm_Pulldown|',
    'Pullups|opc',
    'T-Bar_Row_with_Handle|lc',
    'Underhand_Cable_Pulldowns|c',
    'Bent_Over_Two-Dumbbell_Row|lc',
    'Smith_Machine_Bent_Over_Row|lc',
    'Dumbbell_Incline_Row|c',
    'V-Bar_Pulldown|c',
    'Chin-Up|opc',
    'Dumbbell_Shrug|',
  ],
  Ombros: [
    'Dumbbell_Shoulder_Press|oc',
    'Side_Lateral_Raise|',
    'Reverse_Machine_Flyes|',
    'Machine_Shoulder_Military_Press|oc',
    'Cable_Seated_Lateral_Raise|',
    'Face_Pull|',
    'Leverage_Shoulder_Press|oc',
    'Seated_Dumbbell_Press|oc',
    'Reverse_Flyes|',
    'Standing_Military_Press|olc',
    'Front_Two-Dumbbell_Raise|',
    'Smith_Machine_Overhead_Shoulder_Press|oc',
    'Cable_Rear_Delt_Fly|',
    'Arnold_Dumbbell_Press|oc',
    'Upright_Barbell_Row|op',
  ],
  Bíceps: [
    'Dumbbell_Bicep_Curl|',
    'Hammer_Curls|',
    'Barbell_Curl|p',
    'Incline_Dumbbell_Curl|',
    'Machine_Preacher_Curls|',
    'Cable_Hammer_Curls_-_Rope_Attachment|',
    'Preacher_Curl|p',
    'Standing_Biceps_Cable_Curl|',
    'Concentration_Curls|',
    'Machine_Bicep_Curl|',
    'Alternate_Hammer_Curl|',
    'EZ-Bar_Curl|',
  ],
  Tríceps: [
    'Triceps_Pushdown|',
    'Dips_-_Triceps_Version|op',
    'Seated_Triceps_Press|o',
    'Triceps_Pushdown_-_Rope_Attachment|',
    'Machine_Triceps_Extension|',
    'EZ-Bar_Skullcrusher|p',
    'Cable_Rope_Overhead_Triceps_Extension|o',
    'Close-Grip_Barbell_Bench_Press|op',
    'Tricep_Dumbbell_Kickback|',
    'Dip_Machine|o',
    'Triceps_Pushdown_-_V-Bar_Attachment|',
    'Reverse_Grip_Triceps_Pushdown|',
    'Standing_Dumbbell_Triceps_Extension|o',
    'Bench_Dips|op',
  ],
  Antebraço: [],
  Abdômen: [
    'Crunches|',
    'Cable_Crunch|',
    'Reverse_Crunch|',
    'Ab_Crunch_Machine|',
    'Flat_Bench_Lying_Leg_Raise|l',
    'Oblique_Crunches|',
    'Pallof_Press|',
    'Cable_Seated_Crunch|',
    'Dead_Bug|',
    'Bent-Knee_Hip_Raise|',
    'Dumbbell_Side_Bend|',
    'Russian_Twist|l',
    'Air_Bike|',
    'Sit-Up|l',
  ],
  Quadríceps: [
    'Leg_Press|jc',
    'Leg_Extensions|j',
    'Hack_Squat|jc',
    'Barbell_Squat|jlc',
    'Smith_Machine_Squat|jc',
    'Dumbbell_Lunges|jc',
    'Dumbbell_Squat|jc',
    'Smith_Single-Leg_Split_Squat|jc',
    'Plie_Dumbbell_Squat|jc',
    'Bodyweight_Squat|jc',
    'Dumbbell_Step_Ups|jc',
    'Split_Squat_with_Dumbbells|jc',
    'Barbell_Walking_Lunge|jlc',
    'Thigh_Adductor|',
  ],
  Posterior: [
    'Lying_Leg_Curls|',
    'Romanian_Deadlift|lc',
    'Seated_Leg_Curl|',
    'Stiff-Legged_Dumbbell_Deadlift|lc',
    'Standing_Leg_Curl|',
    'Smith_Machine_Stiff-Legged_Deadlift|lc',
    'Glute_Ham_Raise|lc',
    'Good_Morning|lc',
    'Stiff-Legged_Barbell_Deadlift|lc',
  ],
  Glúteos: [
    'Barbell_Hip_Thrust|c',
    'Thigh_Abductor|',
    'Pull_Through|l',
    'Barbell_Glute_Bridge|c',
    'One-Legged_Cable_Kickback|',
    'Single_Leg_Glute_Bridge|',
    'Glute_Kickback|',
    'Butt_Lift_Bridge|',
  ],
  Panturrilha: [
    'Standing_Calf_Raises|',
    'Seated_Calf_Raise|',
    'Calf_Press_On_The_Leg_Press_Machine|',
    'Smith_Machine_Calf_Raise|',
    'Standing_Dumbbell_Calf_Raise|',
    'Standing_Barbell_Calf_Raise|',
    'Dumbbell_Seated_One-Leg_Calf_Raise|',
    'Calf_Press|',
  ],
  Cardio: [
    'Walking_Treadmill|',
    'Bicycling_Stationary|',
    'Elliptical_Trainer|',
    'Jogging_Treadmill|',
    'Recumbent_Bike|',
    'Rowing_Stationary|',
    'Stairmaster|',
  ],
};

export interface CuratedEntry {
  id: string;
  /** Exercício composto (várias articulações): recebe o esquema mais pesado do objetivo. */
  compound: boolean;
  /** Limitações que tiram este exercício. */
  avoid: Limitation[];
}

const TAGS: Record<string, Limitation> = { j: 'joelho', o: 'ombro', l: 'lombar', p: 'punho' };

export const CURATED: Record<MuscleGroup, CuratedEntry[]> = Object.fromEntries(
  (Object.keys(RAW) as MuscleGroup[]).map((group) => [
    group,
    RAW[group].map((line) => {
      const [id, tags] = line.split('|');
      return {
        id,
        compound: tags.includes('c'),
        avoid: [...tags].filter((tag) => tag in TAGS).map((tag) => TAGS[tag]),
      };
    }),
  ]),
) as Record<MuscleGroup, CuratedEntry[]>;

/** Equipamentos da biblioteca (campo `equipment`) aceitos em cada resposta. */
export const EQUIPMENT_FILTER: Record<EquipmentChoice, string[]> = {
  academia: ['Barra', 'Halteres', 'Máquina', 'Cabo', 'Peso do corpo', 'Barra W'],
  livres: ['Barra', 'Halteres', 'Barra W', 'Peso do corpo'],
  maquinas: ['Máquina', 'Cabo'],
  corpo: ['Peso do corpo'],
};

/** Níveis da biblioteca aceitos em cada nível da pessoa. */
export const LEVEL_FILTER = {
  iniciante: ['Iniciante'],
  intermediario: ['Iniciante', 'Intermediário'],
  avancado: ['Iniciante', 'Intermediário', 'Avançado'],
} as const;
