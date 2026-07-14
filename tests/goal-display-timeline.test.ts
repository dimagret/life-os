import { describe, expect, it } from 'vitest';
import { extractDeclaredGoalDays, getGoalDisplayTimeline } from '@/lib/goalDisplayTimeline';
import type { Goal } from '@/types';

const baseGoal: Goal = {
  id: 'g1', userId: 'u1', title: 'За 7 дней подготовить и отправить предложение',
  originalInput: 'Подготовить предложение', area: 'business', level: 1,
  specific: 'Подготовить предложение', measurable: 'Отправленное предложение',
  deadline: '2026-07-19', why: 'Получить внешний результат',
  externalResult: 'Отправленное предложение', realismScore: 70,
  status: 'active', createdAt: '2026-07-12T09:00:00+03:00', horizon: 'weekly',
};

describe('legacy goal timeline presentation', () => {
  it('extracts declared duration in both locales', () => {
    expect(extractDeclaredGoalDays('За 14 дней собрать лендинг')).toBe(14);
    expect(extractDeclaredGoalDays('Within 7 days, publish a draft')).toBe(7);
  });

  it('corrects only the legacy N+1 deadline presentation', () => {
    const timeline = getGoalDisplayTimeline(baseGoal, '2026-07-12');
    expect(timeline.totalCalendarDays).toBe(7);
    expect(timeline.deadlineDate).toBe('2026-07-18');
    expect(timeline.daysUntilDeadline).toBe(6);
  });

  it('keeps already aligned records unchanged', () => {
    const timeline = getGoalDisplayTimeline(
      { ...baseGoal, deadline: '2026-07-18' },
      '2026-07-12'
    );
    expect(timeline.totalCalendarDays).toBe(7);
    expect(timeline.deadlineDate).toBe('2026-07-18');
  });
});
