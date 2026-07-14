import { describe, it, expect } from 'vitest';
import { calculateScoring, calculateXpDelta } from '@/lib/scoring';
import type { CourtContext } from '@/types';

const baseCtx: CourtContext = {
  strictnessMode: 'standard',
  mainTaskCompleted: false,
  bossTaskCompleted: false,
  proofOk: false,
  courtCompleted: true,
  respectfulReason: false,
  partialCompletion: false,
  selfDeceptionDetected: false,
  recoveryQuestCompletedAfterFailure: false,
};

describe('calculateScoring', () => {
  it('full victory yields positive XP and inner core, reduces abyss, no debt', () => {
    const result = calculateScoring({
      ...baseCtx,
      mainTaskCompleted: true,
      bossTaskCompleted: true,
      proofOk: true,
      externalResultCreated: true,
    });
    expect(result.xpDelta).toBeGreaterThan(0);
    expect(result.innerCoreDelta).toBeGreaterThan(0);
    expect(result.abyssIndexDelta).toBeLessThan(0);
    expect(result.shouldCreateDebt).toBe(false);
    expect(result.debtType).toBeUndefined();
  });

  it('self-deception creates a debt and applies a penalty', () => {
    const result = calculateScoring({
      ...baseCtx,
      selfDeceptionDetected: true,
      failedMainTask: true,
    });
    expect(result.xpDelta).toBeLessThan(0);
    expect(result.shouldCreateDebt).toBe(true);
    expect(result.innerCoreDelta).toBeLessThan(0);
  });

  it('respectful reason without self-deception cancels debt', () => {
    const result = calculateScoring({
      ...baseCtx,
      respectfulReason: true,
      failedMainTask: true,
    });
    expect(result.shouldCreateDebt).toBe(false);
    expect(result.debtType).toBeUndefined();
  });

  it('failed boss task creates a critical debt', () => {
    const result = calculateScoring({
      ...baseCtx,
      failedBossTask: true,
    });
    expect(result.shouldCreateDebt).toBe(true);
    expect(result.debtType).toBe('critical');
  });

  it('repeated pattern creates a systemic debt', () => {
    const result = calculateScoring({
      ...baseCtx,
      repeatedPattern: true,
    });
    expect(result.shouldCreateDebt).toBe(true);
    expect(result.debtType).toBe('systemic');
  });

  it('systemic debt takes priority over ordinary failed boss debt', () => {
    const result = calculateScoring({
      ...baseCtx,
      repeatedPattern: true,
      failedBossTask: true,
    });
    expect(result.shouldCreateDebt).toBe(true);
    expect(result.debtType).toBe('systemic');
  });

  it('clamps xp delta to [-200, 300]', () => {
    const giant: CourtContext = {
      ...baseCtx,
      mainTaskCompleted: true,
      bossTaskCompleted: true,
      proofOk: true,
      externalResultCreated: true,
      partialCompletion: true,
      recoveryQuestCompletedAfterFailure: true,
      strictnessMode: 'owner',
    };
    expect(calculateXpDelta(giant)).toBeLessThanOrEqual(300);

    const punished: CourtContext = {
      ...baseCtx,
      failedMainTask: true,
      failedBossTask: true,
      selfDeceptionDetected: true,
      falseRestDetected: true,
      learningWithoutPractice: true,
      skippedCourt: true,
      strictnessMode: 'owner',
    };
    expect(calculateXpDelta(punished)).toBeGreaterThanOrEqual(-200);
  });

  it('soft mode dampens losses (inner core protection at -3 floor for soft)', () => {
    const result = calculateScoring({
      ...baseCtx,
      strictnessMode: 'soft',
      selfDeceptionDetected: true,
      repeatedPattern: true,
      failedBossTask: true,
    });
    expect(result.innerCoreDelta).toBeGreaterThanOrEqual(-3);
  });
});
