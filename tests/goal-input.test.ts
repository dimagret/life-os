import { describe, expect, it } from 'vitest';
import {
  alignGoalAnalysisToHorizon,
  getGoalInputStats,
  validateGoalInput,
} from '@/lib/goalInput';
import type { GoalAnalysis } from '@/types';

const analysis: GoalAnalysis = {
  originalInput: 'Собрать и показать клиенту первый рабочий лендинг за одну неделю',
  rewrittenGoal: 'За 14 дней собрать первый лендинг и получить обратную связь',
  externalResult: 'Опубликованный лендинг и один ответ',
  realismScore: 72,
  warnings: [],
  suggestedDeadline: '2026-07-25',
  suggestedDeadlineDays: 14,
  suggestedFirstAction: 'Собрать структуру первого экрана',
  suggestedFirstActionMinutes: 25,
};

describe('goal input contract', () => {
  it('explains empty and insufficient goal text with separate issues', () => {
    expect(validateGoalInput('')).toBe('empty');
    expect(validateGoalInput('Сделать сайт')).toBe('short');
    expect(validateGoalInput('Собрать первый лендинг и показать его трём потенциальным клиентам')).toBeNull();
  });

  it('counts visible characters and meaningful words for inline guidance', () => {
    expect(getGoalInputStats('  Собрать первый лендинг  ')).toEqual({
      characters: 22,
      words: 3,
    });
  });

  it('aligns weekly title, preview, and saved deadline to seven inclusive days', () => {
    const aligned = alignGoalAnalysisToHorizon(analysis, 'weekly', 'ru', '2026-07-12');
    expect(aligned.rewrittenGoal).toContain('За 7 дней');
    expect(aligned.suggestedDeadlineDays).toBe(7);
    expect(aligned.suggestedDeadline).toBe('2026-07-18');
  });

  it('aligns the secondary monthly path before preview', () => {
    const aligned = alignGoalAnalysisToHorizon(
      { ...analysis, rewrittenGoal: 'Within 14 days, publish a landing page' },
      'monthly',
      'en',
      '2026-07-12'
    );
    expect(aligned.rewrittenGoal).toContain('In 30 days');
    expect(aligned.suggestedDeadlineDays).toBe(30);
    expect(aligned.suggestedDeadline).toBe('2026-08-10');
  });
});
