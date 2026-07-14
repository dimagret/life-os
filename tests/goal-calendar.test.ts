import { describe, expect, it } from 'vitest';
import {
  addGoalCalendarDays,
  deadlineForCalendarDuration,
  deadlineForGoalHorizon,
  differenceInGoalCalendarDays,
  getGoalTimeline,
  normalizeGoalDateKey,
  replaceGoalDurationPhrase,
} from '@/lib/goalCalendar';

describe('goal calendar policy', () => {
  it('treats a weekly goal as seven inclusive calendar days', () => {
    expect(deadlineForGoalHorizon('weekly', '2026-07-12')).toBe('2026-07-18');
    expect(deadlineForCalendarDuration('2026-07-12', 7)).toBe('2026-07-18');

    const timeline = getGoalTimeline(
      '2026-07-12T00:05:00+03:00',
      '2026-07-18',
      '2026-07-12'
    );
    expect(timeline).toMatchObject({
      totalCalendarDays: 7,
      currentCalendarDay: 1,
      daysUntilDeadline: 6,
      overdueDays: 0,
      isDueToday: false,
    });
  });

  it('distinguishes deadline day from overdue days', () => {
    const due = getGoalTimeline('2026-07-12', '2026-07-18', '2026-07-18');
    expect(due).toMatchObject({
      currentCalendarDay: 7,
      daysUntilDeadline: 0,
      overdueDays: 0,
      isDueToday: true,
      progressPercent: 100,
    });

    const overdue = getGoalTimeline('2026-07-12', '2026-07-18', '2026-07-19');
    expect(overdue).toMatchObject({
      currentCalendarDay: 7,
      daysUntilDeadline: 0,
      overdueDays: 1,
      isDueToday: false,
    });
  });

  it('uses calendar dates across months, leap days, and DST windows', () => {
    expect(addGoalCalendarDays('2026-01-29', 6)).toBe('2026-02-04');
    expect(addGoalCalendarDays('2028-02-25', 6)).toBe('2028-03-02');
    expect(differenceInGoalCalendarDays('2026-03-08', '2026-03-14')).toBe(6);
  });

  it('normalizes legacy timestamps without parsing date-only values as UTC instants', () => {
    expect(normalizeGoalDateKey('2026-07-18')).toBe('2026-07-18');
    expect(normalizeGoalDateKey('not-a-date')).toBeNull();
  });

  it('keeps Russian and English duration phrases aligned with the duration', () => {
    expect(replaceGoalDurationPhrase('За 14 дней собрать лендинг', 7, 'ru')).toBe(
      'За 7 дней собрать лендинг'
    );
    expect(replaceGoalDurationPhrase('Within 14 days, publish a landing page', 7, 'en')).toBe(
      'In 7 days, publish a landing page'
    );
  });
});
