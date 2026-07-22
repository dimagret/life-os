'use client';

import type { ActivationMode } from '@/types';
import { buildFirstRunDraft, completeFirstRun, type FirstRunLocale } from '@/lib/firstRun';
import { loadUserProfile, saveUserProfile, snapshotAllStorage, restoreSnapshot } from '@/lib/storage';
import type { DayPlanTranslator } from '@/lib/dayPlanCreation';

export interface ActivationCompletionInput {
  email: string;
  cadence: string;
  sabotage: string[];
  distractions: string[];
  focusMinutes: number;
  dailyMinutes: number;
  energy: string;
  profileId: string;
  selectedMode: ActivationMode;
  program: { focus: number; blocks: number; volume: number; tasks: number };
  weeklyGoal: string;
  successCriterion: string;
  goalReason?: string;
  startTime: string;
}

export function completeActivation({
  input,
  locale,
  tToday,
}: {
  input: ActivationCompletionInput;
  locale: FirstRunLocale;
  tToday: DayPlanTranslator;
}) {
  const snapshot = snapshotAllStorage();
  try {
    const draft = buildFirstRunDraft(input.weeklyGoal, locale);
    const completed = completeFirstRun({
      draft,
      locale,
      contractAccepted: true,
      tToday,
    });
    const profile = loadUserProfile();
    saveUserProfile({
      ...profile,
      id: completed.goal.userId,
      activation: {
        profileId: input.profileId,
        mode: input.selectedMode,
        cadence: input.cadence,
        sabotage: [...input.sabotage],
        distractions: [...input.distractions],
        focusMinutes: input.focusMinutes,
        dailyMinutes: input.dailyMinutes,
        energy: input.energy,
        program: { ...input.program },
        weeklyGoal: input.weeklyGoal.trim(),
        successCriterion: input.successCriterion.trim(),
        goalReason: input.goalReason?.trim() || undefined,
        startTime: input.startTime,
        completedAt: new Date().toISOString(),
      },
    });
    return completed;
  } catch (error) {
    restoreSnapshot(snapshot);
    throw error;
  }
}
