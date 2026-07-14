import type { Goal } from '@/types';
import {
  deadlineForCalendarDuration,
  getGoalTimeline,
  type GoalTimeline,
} from '@/lib/goalCalendar';

export function extractDeclaredGoalDays(title: string): number | null {
  const ru = /за\s+(\d+)\s+(?:календарн\p{L}*\s+)?д(?:ень|ня|ней)/iu.exec(title);
  const en = /\b(?:in|within)\s+(\d+)\s+(?:calendar\s+)?days?\b/i.exec(title);
  const compactEn = /\b(\d+)[\s-]day\b/i.exec(title);
  const raw = ru?.[1] ?? en?.[1] ?? compactEn?.[1];
  if (!raw) return null;
  const days = Number(raw);
  return Number.isInteger(days) && days > 0 ? days : null;
}

/**
 * Old records stored deadline as start + N while their title promised N inclusive days.
 * Correct only that exact N+1 presentation mismatch; persistence remains untouched.
 */
export function getGoalDisplayTimeline(goal: Goal, today?: string): GoalTimeline {
  const stored = getGoalTimeline(goal.createdAt, goal.deadline, today);
  const declaredDays = extractDeclaredGoalDays(goal.title);
  if (declaredDays && stored.totalCalendarDays === declaredDays + 1) {
    return getGoalTimeline(
      goal.createdAt,
      deadlineForCalendarDuration(stored.startDate, declaredDays),
      today
    );
  }
  return stored;
}
