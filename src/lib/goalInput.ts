import type { GoalAnalysis, GoalHorizon } from '@/types';
import { clamp, getTodayDate } from '@/lib/utils';
import {
  deadlineForCalendarDuration,
  GOAL_HORIZON_CALENDAR_DAYS,
  replaceGoalDurationPhrase,
} from '@/lib/goalCalendar';

export const GOAL_MIN_CHARS = 45;
export const GOAL_MIN_WORDS = 7;

export type GoalInputIssue = 'empty' | 'short' | null;

export function countMeaningfulGoalWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.replace(/[^\p{L}\p{N}]+/gu, '').length > 0).length;
}

export function getGoalInputStats(text: string) {
  const trimmed = text.trim();
  return {
    characters: trimmed.length,
    words: countMeaningfulGoalWords(trimmed),
  };
}

export function validateGoalInput(text: string): GoalInputIssue {
  const stats = getGoalInputStats(text);
  if (!text.trim()) return 'empty';
  if (stats.characters < GOAL_MIN_CHARS || stats.words < GOAL_MIN_WORDS) return 'short';
  return null;
}

export function alignGoalAnalysisDuration(
  analysis: GoalAnalysis,
  inclusiveCalendarDays: number,
  locale: 'ru' | 'en',
  startDate = getTodayDate()
): GoalAnalysis {
  const days = clamp(Math.trunc(inclusiveCalendarDays), 3, 90);
  return {
    ...analysis,
    rewrittenGoal: replaceGoalDurationPhrase(analysis.rewrittenGoal, days, locale),
    suggestedDeadlineDays: days,
    suggestedDeadline: deadlineForCalendarDuration(startDate, days),
  };
}

export function alignGoalAnalysisToHorizon(
  analysis: GoalAnalysis,
  horizon: GoalHorizon,
  locale: 'ru' | 'en',
  startDate = getTodayDate()
): GoalAnalysis {
  return alignGoalAnalysisDuration(
    analysis,
    GOAL_HORIZON_CALENDAR_DAYS[horizon],
    locale,
    startDate
  );
}
