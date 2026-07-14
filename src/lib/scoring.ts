import { CourtContext, ScoringResult } from '@/types';
import { clamp } from '@/lib/utils';

// ——— XP calculation ———

export function calculateXpDelta(context: CourtContext): number {
  let delta = 0;

  // Base rewards
  if (context.mainTaskCompleted) {
    delta += 50;
  }
  if (context.bossTaskCompleted) {
    delta += 80;
  }
  if (context.proofOk) {
    delta += 20;
  }
  if (context.externalResultCreated) {
    delta += 100;
  }
  if (context.courtCompleted) {
    delta += 10;
  }

  // Recovery bonus
  if (context.recoveryQuestCompletedAfterFailure) {
    delta += 60;
  }

  // Partial completion
  if (context.partialCompletion) {
    delta += 25;
  }

  // Penalties
  if (context.failedMainTask) {
    delta -= 30;
  }
  if (context.failedBossTask) {
    delta -= 50;
  }
  if (context.selfDeceptionDetected) {
    delta -= 60;
  }
  if (context.falseRestDetected) {
    delta -= 20;
  }
  if (context.learningWithoutPractice) {
    delta -= 15;
  }
  if (context.missingRequiredProof) {
    delta -= context.strictnessMode === 'hard' || context.strictnessMode === 'owner' ? 30 : 15;
  }

  // Mode multipliers
  if (context.strictnessMode === 'soft') {
    delta = Math.round(delta * 0.8);
  } else if (context.strictnessMode === 'hard') {
    delta = Math.round(delta * 1.2);
  } else if (context.strictnessMode === 'owner') {
    delta = Math.round(delta * 1.3);
  }

  // Skipped court penalty
  if (context.skippedCourt) {
    const skippedPenalty = context.strictnessMode === 'hard' || context.strictnessMode === 'owner' ? -40 : -15;
    delta += skippedPenalty;
  }

  return clamp(delta, -200, 300);
}

// ——— Inner Core calculation ———

export function calculateInnerCoreDelta(context: CourtContext): number {
  let delta = 0;

  // Gains
  if (context.mainTaskCompleted) {
    delta += 3;
  }
  if (context.bossTaskCompleted) {
    delta += 5;
  }
  if (context.courtCompleted) {
    delta += 2;
  }
  if (context.externalResultCreated) {
    delta += 4;
  }
  if (context.recoveryQuestCompletedAfterFailure) {
    delta += 6;
  }

  // Losses
  if (context.selfDeceptionDetected) {
    delta -= 5;
  }
  if (context.repeatedPattern) {
    delta -= 6;
  }
  if (context.falseRestDetected) {
    delta -= 4;
  }
  if (context.failedMainTask) {
    delta -= 2;
  }
  if (context.failedBossTask) {
    delta -= 3;
  }

  // Skipped court
  if (context.skippedCourt) {
    if (context.strictnessMode === 'hard' || context.strictnessMode === 'owner') {
      delta -= 5;
    } else {
      delta -= 2;
    }
  }

  // Soft mode protection
  if (context.strictnessMode === 'soft' && delta < -3) {
    delta = -3;
  }

  return clamp(delta, -15, 15);
}

// ——— Abyss Index calculation ———

export function calculateAbyssDelta(context: CourtContext): number {
  let delta = 0;

  // Increases
  if (context.failedMainTask) {
    delta += 8;
  }
  if (context.failedBossTask) {
    delta += 12;
  }
  if (context.missingRequiredProof) {
    delta += context.strictnessMode === 'hard' || context.strictnessMode === 'owner' ? 8 : 4;
  }
  if (context.selfDeceptionDetected) {
    delta += 10;
  }
  if (context.falseRestDetected) {
    delta += 6;
  }
  if (context.repeatedPattern) {
    delta += 8;
  }
  if (context.learningWithoutPractice) {
    delta += 5;
  }
  if (context.skippedCourt) {
    if (context.strictnessMode === 'hard' || context.strictnessMode === 'owner') {
      delta += 10;
    } else {
      delta += 4;
    }
  }

  // Decreases
  if (context.mainTaskCompleted) {
    delta -= 5;
  }
  if (context.bossTaskCompleted) {
    delta -= 8;
  }
  if (context.recoveryQuestCompletedAfterFailure) {
    delta -= 10;
  }
  if (context.externalResultCreated) {
    delta -= 6;
  }

  return clamp(delta, -20, 30);
}

// ——— Legacy helpers for backward compatibility ———

export function calculateCourtXp(baseXp: number, verdict: string): number {
  const multipliers: Record<string, number> = {
    self_victory: 2.0,
    partial_victory: 1.2,
    respectful_transfer: 0.8,
    failure: 0.2,
    self_deception: 0.0,
    recovered_victory: 1.5,
  };
  return Math.round(baseXp * (multipliers[verdict] ?? 0.5));
}

// ——— Full scoring ———

export function calculateScoring(context: CourtContext): ScoringResult {
  const xpDelta = calculateXpDelta(context);
  const innerCoreDelta = calculateInnerCoreDelta(context);
  const abyssIndexDelta = calculateAbyssDelta(context);

  let shouldCreateDebt = false;
  let debtType: ScoringResult['debtType'];

  if (context.repeatedPattern) {
    shouldCreateDebt = true;
    debtType = 'systemic';
  } else if (context.failedBossTask) {
    shouldCreateDebt = true;
    debtType = 'critical';
  } else if (context.failedMainTask) {
    shouldCreateDebt = true;
    debtType = 'medium';
  } else if (context.selfDeceptionDetected) {
    shouldCreateDebt = true;
    debtType = 'medium';
  } else if (
    context.failedMainTask ||
    context.failedBossTask ||
    context.selfDeceptionDetected
  ) {
    shouldCreateDebt = true;
    debtType = 'small';
  }

  // Respectful reason overrides debt if no self-deception
  if (context.respectfulReason && !context.selfDeceptionDetected) {
    shouldCreateDebt = false;
    debtType = undefined;
  }

  return {
    xpDelta,
    innerCoreDelta,
    abyssIndexDelta,
    shouldCreateDebt,
    debtType,
  };
}
