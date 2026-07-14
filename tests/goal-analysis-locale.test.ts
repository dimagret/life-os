import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGoalAnalysisPrompt } from '@/lib/aiClient';
import { analyzeGoal, getDerivedFirstAction } from '@/lib/mockMentor';

const CYRILLIC = /[А-Яа-яЁё]/;

describe('goal analysis locale', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 12, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds an English-only prompt for English goal analysis', () => {
    const prompt = buildGoalAnalysisPrompt('Build and publish a landing page', 'en');

    expect(prompt).toContain('Write every human-readable JSON string in English.');
    expect(prompt).toContain('suggestedDeadlineDays');
    expect(prompt).not.toMatch(CYRILLIC);
  });

  it('keeps Russian as the backward-compatible default prompt', () => {
    expect(buildGoalAnalysisPrompt('Собрать и показать лендинг')).toContain(
      'Проанализируй цель'
    );
  });

  it('returns English fallback content, including the original-goal first action', () => {
    const analysis = analyzeGoal(
      'I want to learn web design and publish a first landing page',
      1,
      'en'
    );
    const originalAction = getDerivedFirstAction(analysis, 'original', 1, 'en');

    expect(JSON.stringify(analysis)).not.toMatch(CYRILLIC);
    expect(analysis.rewrittenGoal).toMatch(/^In \d+ days,/);
    expect(analysis.warnings.length).toBeGreaterThan(0);
    expect(originalAction.text).not.toMatch(CYRILLIC);
  });

  it('preserves the existing Russian fallback when locale is omitted', () => {
    const input = 'Хочу изучать дизайн и показать первый экран';
    const defaultAnalysis = analyzeGoal(input, 1);
    const explicitRussian = analyzeGoal(input, 1, 'ru');

    expect(defaultAnalysis).toEqual(explicitRussian);
    expect(JSON.stringify(defaultAnalysis)).toMatch(CYRILLIC);
  });
});
