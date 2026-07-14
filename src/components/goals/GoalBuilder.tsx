'use client';

import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Goal, GoalAnalysis, GoalHorizon } from '@/types';
import { analyzeGoalAsync } from '@/lib/aiMentor';
import { calculateRealismScore, getDerivedFirstAction } from '@/lib/mockMentor';
import { loadUserProfile, createGoal, getActiveMonthlyGoal } from '@/lib/storage';
import {
  alignGoalAnalysisDuration,
  alignGoalAnalysisToHorizon,
  getGoalInputStats,
  GOAL_MIN_CHARS,
  GOAL_MIN_WORDS,
  type GoalInputIssue,
  validateGoalInput,
} from '@/lib/goalInput';
import { deadlineForGoalHorizon, replaceGoalDurationPhrase } from '@/lib/goalCalendar';
import { clamp } from '@/lib/utils';
import { GoalAnalysisCard, GoalFocus } from './GoalAnalysisCard';

interface GoalBuilderProps {
  onComplete: () => void;
  onCancel: () => void;
  /** Горизонт создаваемой цели. По умолчанию 'weekly' для совместимости. */
  defaultHorizon?: GoalHorizon;
}

const MONTHLY_MIN_DEADLINE_DAYS = 21;

type BuilderStep = 'input' | 'analysis';

const AREA_KEYS = ['money', 'health', 'skill', 'business', 'discipline', 'relationship', 'product', 'other'] as const;
const LEVEL_VALUES = [0, 1, 2, 3, 4, 5] as const;

function cloneAnalysis(analysis: GoalAnalysis): GoalAnalysis {
  return JSON.parse(JSON.stringify(analysis)) as GoalAnalysis;
}

function analysesEqual(a: GoalAnalysis, b: GoalAnalysis): boolean {
  return (
    a.realismScore === b.realismScore &&
    a.suggestedDeadlineDays === b.suggestedDeadlineDays &&
    a.suggestedDeadline === b.suggestedDeadline &&
    a.suggestedFirstAction === b.suggestedFirstAction &&
    a.suggestedFirstActionMinutes === b.suggestedFirstActionMinutes &&
    a.rewrittenGoal === b.rewrittenGoal &&
    a.externalResult === b.externalResult &&
    a.originalInput === b.originalInput
  );
}

/** Показываем реалистичность выбранной формулировки, не смешивая её с альтернативой. */
function resolveDisplayRealism(
  analysis: GoalAnalysis,
  goalFocus: GoalFocus,
  level: number,
  goalInputFallback: string
): number {
  const originalText = analysis.originalInput.trim() || goalInputFallback.trim();
  const workingScore = analysis.realismScore;

  if (goalFocus === 'working') return workingScore;

  const originalHeuristic = calculateRealismScore(originalText, level);
  const formulationsDiffer =
    originalText.length > 0 && analysis.rewrittenGoal.trim() !== originalText;

  if (!formulationsDiffer) return originalHeuristic;

  return clamp(Math.min(originalHeuristic, workingScore - 8), 0, 100);
}

export function GoalBuilder({ onComplete, onCancel, defaultHorizon = 'weekly' }: GoalBuilderProps) {
  const [step, setStep] = useState<BuilderStep>('input');
  const [goalInput, setGoalInput] = useState('');
  const [area, setArea] = useState<Goal['area']>('skill');
  const [level, setLevel] = useState<number>(1);
  const [doneSoFar, setDoneSoFar] = useState('');
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [analysisBackup, setAnalysisBackup] = useState<GoalAnalysis | null>(null);
  const [goalFocus, setGoalFocus] = useState<GoalFocus>('working');
  const [goalInputIssue, setGoalInputIssue] = useState<GoalInputIssue>(null);
  const [requestError, setRequestError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [firstStepDraft, setFirstStepDraft] = useState('');
  const goalInputRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations('goalBuilder');
  const tc = useTranslations('common');
  const ta = useTranslations('analysisCard');
  const rawLocale = useLocale();
  const durationLocale: 'ru' | 'en' = rawLocale.startsWith('en') ? 'en' : 'ru';
  const isWeekly = defaultHorizon === 'weekly';

  const inputStats = useMemo(() => getGoalInputStats(goalInput), [goalInput]);
  const inputIsValid = validateGoalInput(goalInput) === null;
  const inputError =
    goalInputIssue === 'empty'
      ? t('errorEmpty')
      : goalInputIssue === 'short'
        ? t('errorShort')
        : '';

  const displayRealismScore = useMemo(() => {
    if (!analysis) return 0;
    return resolveDisplayRealism(analysis, goalFocus, level, goalInput);
  }, [analysis, goalFocus, level, goalInput]);

  const canRestoreAnalysisBackup =
    !!analysisBackup && !!analysis && !analysesEqual(analysis, analysisBackup);

  const firstStepPreview = useMemo(() => {
    if (!analysis) return null;
    const derived = getDerivedFirstAction(analysis, goalFocus, level, durationLocale);
    const effectiveFirst = firstStepDraft.trim() || derived.text;
    const isAutomatic = firstStepDraft.trim() === derived.text.trim();
    const useLinkedResult = goalFocus === 'original' || !isAutomatic;
    const displayExternal =
      useLinkedResult && effectiveFirst.trim()
        ? ta('externalLinked', { step: effectiveFirst, base: analysis.externalResult })
        : analysis.externalResult;

    return {
      effectiveFirst,
      displayExternal,
      displayMinutes: isAutomatic ? derived.minutes : 15,
      derived,
      firstStepIsCustom: !isAutomatic,
    };
  }, [analysis, goalFocus, level, firstStepDraft, ta, durationLocale]);

  const updateGoalInput = (value: string) => {
    setGoalInput(value);
    setRequestError('');
    if (goalInputIssue) setGoalInputIssue(validateGoalInput(value));
  };

  const handleAnalyze = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const issue = validateGoalInput(goalInput);
    if (issue) {
      setGoalInputIssue(issue);
      setRequestError('');
      window.requestAnimationFrame(() => goalInputRef.current?.focus());
      return;
    }

    setGoalInputIssue(null);
    setRequestError('');
    setAnalyzing(true);
    try {
      const result = await analyzeGoalAsync(goalInput, level, durationLocale);
      const originalInput = result.originalInput?.trim() ? result.originalInput : goalInput;
      const aligned = alignGoalAnalysisToHorizon(
        { ...result, originalInput },
        defaultHorizon,
        durationLocale
      );
      setAnalysis(aligned);
      setAnalysisBackup(cloneAnalysis(aligned));
      setGoalFocus('working');
      setFirstStepDraft(getDerivedFirstAction(aligned, 'working', level, durationLocale).text);
      setStep('analysis');
    } catch {
      setRequestError(t('errorAnalysis'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateGoal = () => {
    if (!analysis || !firstStepPreview) return;

    setRequestError('');
    const profile = loadUserProfile();
    const useWorking = goalFocus === 'working';
    const originalText = analysis.originalInput.trim() || goalInput.trim();
    const originalTitle = replaceGoalDurationPhrase(
      originalText,
      analysis.suggestedDeadlineDays,
      durationLocale
    );
    const title = useWorking ? analysis.rewrittenGoal : originalTitle;
    const realismScore = resolveDisplayRealism(analysis, goalFocus, level, goalInput);

    let deadline = analysis.suggestedDeadline;
    if (
      defaultHorizon === 'monthly' &&
      analysis.suggestedDeadlineDays < MONTHLY_MIN_DEADLINE_DAYS
    ) {
      deadline = deadlineForGoalHorizon('monthly');
    }

    const parentGoalId =
      defaultHorizon === 'weekly' ? getActiveMonthlyGoal()?.id : undefined;

    const newGoal: Omit<Goal, 'id' | 'createdAt'> = {
      userId: profile.id,
      title,
      originalInput: goalInput,
      area,
      level: level as 0 | 1 | 2 | 3 | 4 | 5,
      specific: title,
      measurable: firstStepPreview.displayExternal,
      deadline,
      why: doneSoFar || t('defaultWhy'),
      externalResult: firstStepPreview.displayExternal,
      realismScore,
      status: 'active',
      horizon: defaultHorizon,
      parentGoalId,
    };

    try {
      createGoal(newGoal);
      onComplete();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setRequestError(
        code === 'active_goal_exists' ? t('errorActiveExists') : t('errorAnalysis')
      );
    }
  };

  const handleRestoreAnalysis = () => {
    if (!analysisBackup) return;
    const next = cloneAnalysis(analysisBackup);
    setAnalysis(next);
    setFirstStepDraft(getDerivedFirstAction(next, goalFocus, level, durationLocale).text);
  };

  const handleGoalFocusChange = (next: GoalFocus) => {
    setGoalFocus(next);
    if (!analysis) return;
    setFirstStepDraft(getDerivedFirstAction(analysis, next, level, durationLocale).text);
  };

  const handleAdjust = (direction: 'softer' | 'harder') => {
    if (!analysis) return;

    const dayDelta = direction === 'softer' ? 7 : -3;
    const scoreDelta = direction === 'softer' ? 10 : -10;
    const minimumDays = defaultHorizon === 'monthly' ? MONTHLY_MIN_DEADLINE_DAYS : 3;
    const newDays = clamp(analysis.suggestedDeadlineDays + dayDelta, minimumDays, 90);
    const newMinutes = direction === 'softer' ? 5 : 30;
    const durationAligned = alignGoalAnalysisDuration(
      analysis,
      newDays,
      durationLocale
    );

    setAnalysis({
      ...durationAligned,
      suggestedFirstActionMinutes: newMinutes,
      realismScore: clamp(analysis.realismScore + scoreDelta, 0, 100),
    });
  };

  const renderContextDetails = () => (
    <details className="tactile-card group px-4 py-3">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm font-medium text-[var(--text-secondary)] [&::-webkit-details-marker]:hidden">
        <span
          className="text-[var(--text-muted)] transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          ›
        </span>
        {t('contextSummary')}
      </summary>
      <div className="mt-3 space-y-5 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          {t('contextHint')}
        </p>

        <fieldset>
          <legend className="mb-2 text-sm text-[var(--text-secondary)]">
            {t('areaLabel')}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {AREA_KEYS.map((key) => {
              const selected = area === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setArea(key)}
                  className="selection-control p-3 text-sm"
                >
                  {t(`areas.${key}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm text-[var(--text-secondary)]">
            {t('levelLabel')}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {LEVEL_VALUES.map((value) => {
              const selected = level === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLevel(value)}
                  className="selection-control p-3 text-left text-sm"
                >
                  {t(`levels.${value}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="goal-done-so-far"
            className="mb-2 block text-sm text-[var(--text-secondary)]"
          >
            {t('doneSoFarLabel')} <span className="text-[var(--text-muted)]">{t('optional')}</span>
          </label>
          <input
            id="goal-done-so-far"
            type="text"
            value={doneSoFar}
            onChange={(event) => setDoneSoFar(event.target.value)}
            placeholder={t('doneSoFarPlaceholder')}
            className="tactile-field w-full p-3 text-sm placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-brand)] focus:outline-none"
          />
        </div>
      </div>
    </details>
  );

  const renderInputStep = () => (
    <form className="space-y-6" onSubmit={handleAnalyze} noValidate>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-brand)]">
          {t(isWeekly ? 'weeklyEyebrow' : 'monthlyEyebrow')}
        </p>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {t(isWeekly ? 'weeklyInputTitle' : 'monthlyInputTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {t(isWeekly ? 'weeklyInputDesc' : 'monthlyInputDesc')}
        </p>
      </div>

      <div>
        <label
          htmlFor="goal-input"
          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
        >
          {t(isWeekly ? 'weeklyInputLabel' : 'monthlyInputLabel')}
        </label>
        <p id="goal-input-help" className="mb-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {t(isWeekly ? 'weeklyInputHelp' : 'monthlyInputHelp')}
        </p>
        <textarea
          ref={goalInputRef}
          id="goal-input"
          value={goalInput}
          onChange={(event) => updateGoalInput(event.target.value)}
          placeholder={t(isWeekly ? 'weeklyPlaceholder' : 'monthlyPlaceholder')}
          aria-invalid={Boolean(inputError)}
          aria-describedby={`goal-input-help goal-input-requirements${inputError ? ' goal-input-error' : ''}`}
          className={`tactile-field h-32 w-full resize-none p-4 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none ${
            inputError
              ? 'border-[var(--state-deception)] focus:border-[var(--state-deception)]'
              : 'focus:border-[var(--accent-brand)]'
          }`}
        />
        <p
          id="goal-input-requirements"
          className={`mt-2 text-xs leading-relaxed ${
            inputIsValid ? 'text-[var(--state-recovery)]' : 'text-[var(--text-muted)]'
          }`}
          aria-live="polite"
        >
          {inputIsValid
            ? t('requirementsMet')
            : t('requirementsProgress', {
                words: inputStats.words,
                minWords: GOAL_MIN_WORDS,
                characters: inputStats.characters,
                minCharacters: GOAL_MIN_CHARS,
              })}
        </p>
        {inputError ? (
          <p
            id="goal-input-error"
            role="alert"
            className="mt-2 text-sm text-[var(--state-deception)]"
          >
            {inputError}
          </p>
        ) : null}
      </div>

      {renderContextDetails()}

      {requestError ? (
        <p role="alert" className="text-sm text-[var(--state-deception)]">
          {requestError}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="tactile-button tactile-button-secondary flex-1 py-4 text-sm hover:bg-[var(--bg-hover)]"
        >
          {tc('cancel')}
        </button>
        <button
          type="submit"
          disabled={analyzing}
          className="tactile-button tactile-button-primary flex-1 py-4 text-sm hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
        >
          {analyzing
            ? t('analyzing')
            : t(isWeekly ? 'analyzeWeekly' : 'analyzeMonthly')}
        </button>
      </div>
    </form>
  );

  const renderAnalysisStep = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {t('step3Title')}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">{t('step3Desc')}</p>
        </div>

        <GoalAnalysisCard
          analysis={analysis}
          goalFocus={goalFocus}
          onGoalFocusChange={handleGoalFocusChange}
          displayRealismScore={displayRealismScore}
          canRestoreBackup={canRestoreAnalysisBackup}
          onRestoreBackup={canRestoreAnalysisBackup ? handleRestoreAnalysis : undefined}
          firstStepDraft={firstStepDraft}
          onFirstStepDraftChange={setFirstStepDraft}
          firstStepMinutes={firstStepPreview?.displayMinutes ?? 15}
          displayExternalResult={firstStepPreview?.displayExternal ?? analysis.externalResult}
          onResetFirstStep={
            firstStepPreview?.firstStepIsCustom
              ? () => setFirstStepDraft(firstStepPreview.derived.text)
              : undefined
          }
          firstStepIsCustom={firstStepPreview?.firstStepIsCustom ?? false}
        />

        {requestError ? (
          <p role="alert" className="text-sm text-[var(--state-deception)]">
            {requestError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCreateGoal}
            className="tactile-button tactile-button-primary w-full py-4 text-sm hover:opacity-90"
          >
            {t(isWeekly ? 'saveWeekly' : 'saveMonthly')}
          </button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setRequestError('');
                setStep('input');
              }}
              className="tactile-button tactile-button-secondary py-3 text-sm hover:bg-[var(--bg-hover)]"
            >
              {t('changeInput')}
            </button>
            <button
              type="button"
              onClick={() => handleAdjust('softer')}
              className="tactile-button tactile-button-secondary py-3 text-sm hover:bg-[var(--bg-hover)]"
            >
              {t('makeSofter')}
            </button>
            <button
              type="button"
              onClick={() => handleAdjust('harder')}
              className="tactile-button tactile-button-secondary py-3 text-sm hover:bg-[var(--bg-hover)]"
            >
              {t('makeHarder')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-page">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {tc('back')}
          </button>
        </div>

        {step === 'input' ? renderInputStep() : renderAnalysisStep()}
      </div>
    </div>
  );
}




