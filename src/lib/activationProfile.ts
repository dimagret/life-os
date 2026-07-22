export type ActivationModeId = 'gentle' | 'base' | 'intensive';

export type DisciplineProfileId =
  | 'depleted'
  | 'overloaded'
  | 'avoidant'
  | 'perfectionist'
  | 'analytical'
  | 'busywork'
  | 'fragmented'
  | 'building'
  | 'stable';

export interface ActivationProfileInput {
  cadence: string;
  sabotage: string[];
  distractions: string[];
  focusMinutes: number;
  dailyMinutes: number;
  energy: string;
}

export interface ActivationProfileResult {
  profileId: DisciplineProfileId;
  recommendedMode: ActivationModeId;
  evidence: ActivationProfileInput;
}

export interface ActivationProgramInput {
  profileId: DisciplineProfileId;
  mode: ActivationModeId;
  focusMinutes: number;
  dailyMinutes: number;
}

export interface ActivationProgram {
  focus: number;
  blocks: number;
  volume: number;
  tasks: number;
}

const PROGRAM_TUNING: Record<DisciplineProfileId, {
  focusDelta: number;
  blocksDelta: number;
  volumeRatio: number;
  tasksDelta: number;
}> = {
  depleted: { focusDelta: -10, blocksDelta: -1, volumeRatio: 0.5, tasksDelta: -2 },
  overloaded: { focusDelta: -5, blocksDelta: -1, volumeRatio: 0.65, tasksDelta: -2 },
  avoidant: { focusDelta: -10, blocksDelta: -1, volumeRatio: 0.7, tasksDelta: -2 },
  perfectionist: { focusDelta: -5, blocksDelta: -1, volumeRatio: 0.75, tasksDelta: -1 },
  analytical: { focusDelta: -5, blocksDelta: -1, volumeRatio: 0.8, tasksDelta: -1 },
  busywork: { focusDelta: 0, blocksDelta: -1, volumeRatio: 0.75, tasksDelta: -2 },
  fragmented: { focusDelta: -10, blocksDelta: -1, volumeRatio: 0.7, tasksDelta: -1 },
  building: { focusDelta: 0, blocksDelta: 0, volumeRatio: 1, tasksDelta: 0 },
  stable: { focusDelta: 5, blocksDelta: 0, volumeRatio: 1, tasksDelta: 0 },
};

function countMatches(values: string[], matches: readonly string[]) {
  return values.filter((value) => matches.includes(value)).length;
}

function has(values: string[], value: string) {
  return values.includes(value);
}

export function deriveActivationProfile({
  cadence,
  sabotage,
  distractions,
  focusMinutes,
  dailyMinutes,
  energy,
}: ActivationProfileInput): ActivationProfileResult {
  const capacityRatio = dailyMinutes / Math.max(focusMinutes, 1);
  const plansInsteadOfActs = has(sabotage, 'planning');
  const learnsInsteadOfActs = has(sabotage, 'learning');

  const depletedScore =
    (energy === 'low' ? 3 : 0) +
    (focusMinutes <= 20 ? 2 : 0) +
    (dailyMinutes <= 60 ? 1 : 0) +
    (cadence === 'rare' ? 1 : 0);

  const overloadScore =
    (has(sabotage, 'overload') ? 3 : 0) +
    (has(sabotage, 'perfectionism') ? 1 : 0) +
    (capacityRatio > 5 ? 2 : 0) +
    (dailyMinutes >= 180 ? 1 : 0) +
    (sabotage.length >= 4 ? 1 : 0);

  const avoidanceScore =
    (has(sabotage, 'delay') ? 3 : 0) +
    (has(sabotage, 'perfectionism') ? 1 : 0) +
    (cadence === 'rare' ? 3 : cadence === 'sometimes' ? 1 : 0);

  const perfectionismScore =
    (has(sabotage, 'perfectionism') ? 3 : 0) +
    (plansInsteadOfActs ? 1 : 0) +
    (has(sabotage, 'overload') ? 1 : 0) +
    (dailyMinutes >= 180 ? 1 : 0);

  const analyticalScore =
    (plansInsteadOfActs || learnsInsteadOfActs ? 3 : 0) +
    (plansInsteadOfActs && learnsInsteadOfActs ? 1 : 0) +
    (has(distractions, 'research') ? 2 : 0) +
    (has(distractions, 'busywork') ? 1 : 0);

  const busyworkScore =
    (has(distractions, 'busywork') ? 3 : 0) +
    (has(sabotage, 'switch') ? 1 : 0) +
    (plansInsteadOfActs ? 1 : 0);

  const fragmentationScore =
    (has(sabotage, 'switch') ? 3 : 0) +
    countMatches(distractions, ['gadget', 'social', 'otherTasks', 'internal']) +
    (distractions.length >= 4 ? 2 : 0);

  const riskScores: Array<[Exclude<DisciplineProfileId, 'building' | 'stable'>, number]> = [
    ['depleted', depletedScore],
    ['overloaded', overloadScore],
    ['avoidant', avoidanceScore],
    ['perfectionist', perfectionismScore],
    ['analytical', analyticalScore],
    ['busywork', busyworkScore],
    ['fragmented', fragmentationScore],
  ];
  const [dominantRisk, dominantRiskScore] = riskScores.reduce((current, candidate) =>
    candidate[1] > current[1] ? candidate : current
  );

  const stabilityScore =
    (cadence === 'stable' ? 3 : cadence === 'often' ? 1 : 0) +
    (energy === 'stable' ? 2 : 0) +
    (distractions.length <= 1 ? 1 : 0) +
    (sabotage.length <= 1 ? 1 : 0) +
    (focusMinutes >= 35 ? 1 : 0) +
    (dailyMinutes >= 120 ? 1 : 0);

  const profileId: DisciplineProfileId = stabilityScore >= 8 && dominantRiskScore <= 3
    ? 'stable'
    : dominantRiskScore >= 4
      ? dominantRisk
      : 'building';

  const needsGentleEntry =
    profileId === 'depleted' ||
    energy === 'low' ||
    cadence === 'rare' ||
    distractions.length >= 4 ||
    sabotage.length >= 4 ||
    (profileId === 'overloaded' && (capacityRatio > 5 || dailyMinutes >= 180)) ||
    (profileId === 'avoidant' && cadence === 'sometimes') ||
    (profileId === 'fragmented' && distractions.length >= 3);

  const supportsIntensive =
    profileId === 'stable' &&
    cadence === 'stable' &&
    energy === 'stable' &&
    distractions.length <= 1 &&
    focusMinutes >= 35 &&
    dailyMinutes >= 120;

  return {
    profileId,
    recommendedMode: needsGentleEntry ? 'gentle' : supportsIntensive ? 'intensive' : 'base',
    evidence: {
      cadence,
      sabotage: [...sabotage],
      distractions: [...distractions],
      focusMinutes,
      dailyMinutes,
      energy,
    },
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}

function roundToFive(value: number) {
  return Math.round(value / 5) * 5;
}

export function deriveActivationProgram({
  profileId,
  mode,
  focusMinutes,
  dailyMinutes,
}: ActivationProgramInput): ActivationProgram {
  const basePrograms: Record<ActivationModeId, ActivationProgram> = {
    gentle: {
      focus: clamp(focusMinutes, 10, 20),
      blocks: 2,
      volume: clamp(dailyMinutes, 30, 90),
      tasks: 3,
    },
    base: {
      focus: clamp(focusMinutes, 20, 40),
      blocks: 3,
      volume: clamp(dailyMinutes, 60, 150),
      tasks: 4,
    },
    intensive: {
      focus: clamp(focusMinutes, 35, 60),
      blocks: 4,
      volume: clamp(dailyMinutes, 120, 240),
      tasks: 5,
    },
  };
  const base = basePrograms[mode];
  const tuning = PROGRAM_TUNING[profileId];

  return {
    focus: clamp(base.focus + tuning.focusDelta, 10, 60),
    blocks: clamp(base.blocks + tuning.blocksDelta, 1, 4),
    volume: clamp(roundToFive(base.volume * tuning.volumeRatio), 30, 240),
    tasks: clamp(base.tasks + tuning.tasksDelta, 1, 5),
  };
}
