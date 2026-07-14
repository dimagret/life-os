import type { GoalHorizon } from '@/types';
import { clamp, formatLocalDate, getTodayDate } from '@/lib/utils';

const DAY_MS = 24 * 60 * 60 * 1000;

export const GOAL_HORIZON_CALENDAR_DAYS: Record<GoalHorizon, number> = {
  weekly: 7,
  monthly: 30,
};

function partsFromDateKey(dateKey: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return [year, month, day];
}

function ordinal(dateKey: string): number | null {
  const parts = partsFromDateKey(dateKey);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / DAY_MS);
}

function dateKeyFromOrdinal(value: number): string {
  const date = new Date(value * DAY_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converts date-only storage and legacy ISO timestamps to a local calendar key. */
export function normalizeGoalDateKey(value: string | Date): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatLocalDate(value);
  }
  const trimmed = value.trim();
  if (partsFromDateKey(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : formatLocalDate(parsed);
}

export function addGoalCalendarDays(dateKey: string, days: number): string {
  const start = ordinal(dateKey);
  if (start === null) throw new Error('invalid_goal_date');
  return dateKeyFromOrdinal(start + Math.trunc(days));
}

/** Duration includes the start date: seven calendar days end at start + 6. */
export function deadlineForCalendarDuration(
  startDateKey: string,
  inclusiveCalendarDays: number
): string {
  const duration = Math.max(1, Math.trunc(inclusiveCalendarDays));
  return addGoalCalendarDays(startDateKey, duration - 1);
}

export function deadlineForGoalHorizon(
  horizon: GoalHorizon,
  startDateKey = getTodayDate()
): string {
  return deadlineForCalendarDuration(startDateKey, GOAL_HORIZON_CALENDAR_DAYS[horizon]);
}

export function differenceInGoalCalendarDays(fromDateKey: string, toDateKey: string): number {
  const from = ordinal(fromDateKey);
  const to = ordinal(toDateKey);
  if (from === null || to === null) throw new Error('invalid_goal_date');
  return to - from;
}

export interface GoalTimeline {
  startDate: string;
  deadlineDate: string;
  todayDate: string;
  totalCalendarDays: number;
  currentCalendarDay: number;
  daysUntilDeadline: number;
  overdueDays: number;
  isDueToday: boolean;
  progressPercent: number;
}

export function getGoalTimeline(
  createdAt: string,
  deadline: string,
  today = getTodayDate()
): GoalTimeline {
  const todayDate = normalizeGoalDateKey(today) ?? getTodayDate();
  const startDate = normalizeGoalDateKey(createdAt) ?? todayDate;
  const deadlineDate = normalizeGoalDateKey(deadline) ?? startDate;
  const rawTotal = differenceInGoalCalendarDays(startDate, deadlineDate) + 1;
  const totalCalendarDays = Math.max(1, rawTotal);
  const currentCalendarDay = clamp(
    differenceInGoalCalendarDays(startDate, todayDate) + 1,
    1,
    totalCalendarDays
  );
  const deadlineDelta = differenceInGoalCalendarDays(todayDate, deadlineDate);

  return {
    startDate,
    deadlineDate,
    todayDate,
    totalCalendarDays,
    currentCalendarDay,
    daysUntilDeadline: Math.max(0, deadlineDelta),
    overdueDays: Math.max(0, -deadlineDelta),
    isDueToday: deadlineDelta === 0,
    progressPercent: clamp((currentCalendarDay / totalCalendarDays) * 100, 0, 100),
  };
}

export function formatGoalCalendarDate(dateKey: string, locale: string): string {
  const parts = partsFromDateKey(dateKey);
  if (!parts) return dateKey;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
    locale.startsWith('en') ? 'en-US' : 'ru-RU',
    { day: 'numeric', month: 'long' }
  );
}

function russianDays(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

/** Keeps a generated duration phrase aligned with the displayed and saved deadline. */
export function replaceGoalDurationPhrase(
  title: string,
  inclusiveCalendarDays: number,
  locale: 'ru' | 'en'
): string {
  const days = Math.max(1, Math.trunc(inclusiveCalendarDays));
  if (locale === 'en') {
    const replacement = `In ${days} days`;
    if (/\b(?:in|within)\s+\d+\s+(?:calendar\s+)?days?\b/i.test(title)) {
      return title.replace(/\b(?:in|within)\s+\d+\s+(?:calendar\s+)?days?\b/i, replacement);
    }
    if (/\b\d+[\s-]day\b/i.test(title)) {
      return title.replace(/\b\d+[\s-]day\b/i, `${days}-day`);
    }
    return title;
  }

  const replacement = `За ${days} ${russianDays(days)}`;
  return /за\s+\d+\s+(?:календарн\p{L}*\s+)?д(?:ень|ня|ней)/iu.test(title)
    ? title.replace(/за\s+\d+\s+(?:календарн\p{L}*\s+)?д(?:ень|ня|ней)/iu, replacement)
    : title;
}
