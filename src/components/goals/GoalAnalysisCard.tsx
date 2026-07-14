'use client';

import { useLocale, useTranslations } from 'next-intl';
import { GoalAnalysis } from '@/types';
import { formatGoalCalendarDate } from '@/lib/goalCalendar';
import { RealismScore } from './RealismScore';
import { TriangleAlert } from 'lucide-react';

export type GoalFocus = 'working' | 'original';

interface GoalAnalysisCardProps {
  analysis: GoalAnalysis;
  goalFocus: GoalFocus;
  onGoalFocusChange: (focus: GoalFocus) => void;
  displayRealismScore: number;
  canRestoreBackup?: boolean;
  onRestoreBackup?: () => void;
  firstStepDraft: string;
  onFirstStepDraftChange: (value: string) => void;
  firstStepMinutes: number;
  displayExternalResult: string;
  onResetFirstStep?: () => void;
  firstStepIsCustom: boolean;
}

export function GoalAnalysisCard({
  analysis,
  goalFocus,
  onGoalFocusChange,
  displayRealismScore,
  canRestoreBackup,
  onRestoreBackup,
  firstStepDraft,
  onFirstStepDraftChange,
  firstStepMinutes,
  displayExternalResult,
  onResetFirstStep,
  firstStepIsCustom,
}: GoalAnalysisCardProps) {
  const t = useTranslations('analysisCard');
  const locale = useLocale();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="block text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t('focusTitle')}
        </span>
        <div
          className="tactile-inset flex gap-1 p-1"
          role="group"
          aria-label={t('focusTitle')}
        >
          <button
            type="button"
            aria-pressed={goalFocus === 'working'}
            onClick={() => onGoalFocusChange('working')}
            className="selection-control flex-1 px-3 py-2.5 text-sm font-medium"
          >
            {t('focusWorking')}
          </button>
          <button
            type="button"
            aria-pressed={goalFocus === 'original'}
            onClick={() => onGoalFocusChange('original')}
            className="selection-control flex-1 px-3 py-2.5 text-sm font-medium"
          >
            {t('focusOriginal')}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('focusHint')}</p>
        {canRestoreBackup && onRestoreBackup ? (
          <button
            type="button"
            onClick={onRestoreBackup}
            className="text-xs font-medium text-[var(--accent-brand)] hover:underline"
          >
            {t('restoreBackup')}
          </button>
        ) : null}
      </div>

      <div
        className="tactile-card p-4 transition-shadow"
        style={goalFocus === 'original' ? { borderColor: 'var(--state-border)', backgroundColor: 'var(--state-soft)' } : undefined}
      >
        <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t('originalGoal')}
        </span>
        <p className="text-sm text-[var(--text-secondary)]">{analysis.originalInput}</p>
      </div>

      <div
        className="tactile-card p-4 transition-shadow"
        style={goalFocus === 'working' ? { borderColor: 'var(--state-border)', backgroundColor: 'var(--state-soft)' } : undefined}
      >
        <span
          className="mb-2 block text-xs uppercase tracking-wider"
          style={{ color: goalFocus === 'working' ? 'var(--state-color)' : 'var(--text-muted)' }}
        >
          {t('workingGoal')}
        </span>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {analysis.rewrittenGoal}
        </p>
      </div>

      <div data-state="control" className="tactile-card state-bg state-border-active border p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <label
            htmlFor="goal-first-step"
            className="block text-xs uppercase tracking-wider state-text"
          >
            {t('firstStep', { minutes: firstStepMinutes })}
          </label>
          {firstStepIsCustom && onResetFirstStep ? (
            <button
              type="button"
              onClick={onResetFirstStep}
              className="shrink-0 text-xs font-medium text-[var(--accent-brand)] hover:underline"
            >
              {t('firstStepReset')}
            </button>
          ) : null}
        </div>
        <p
          id="goal-first-step-help"
          className="mb-2 text-xs leading-relaxed text-[var(--text-muted)]"
        >
          {t('firstStepSectionHint')}
        </p>
        <textarea
          id="goal-first-step"
          value={firstStepDraft}
          onChange={(event) => onFirstStepDraftChange(event.target.value)}
          placeholder={t('firstStepPlaceholder')}
          aria-describedby="goal-first-step-help"
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--border-strong)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-brand)] focus:outline-none"
        />
      </div>

      <div className="tactile-card p-4">
        <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t('externalResult')}
        </span>
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">{displayExternalResult}</p>
      </div>

      <RealismScore key={goalFocus} score={displayRealismScore} />

      {analysis.warnings.length > 0 ? (
        <div className="tactile-card p-4">
          <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t('warnings')}
          </span>
          <ul className="space-y-2">
            {analysis.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--state-risk)]"
                  aria-hidden="true"
                />
                <p className="text-sm text-[var(--text-secondary)]">{warning}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="tactile-card p-4">
        <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t('suggestedDeadline')}
        </span>
        <p className="text-sm text-[var(--text-primary)]">
          {formatGoalCalendarDate(analysis.suggestedDeadline, locale)}
          <span className="text-[var(--text-muted)]">
            {' '}· {t('inDays', { days: analysis.suggestedDeadlineDays })}
          </span>
        </p>
      </div>

      <div className="tactile-card p-4">
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('note')}</p>
      </div>
    </div>
  );
}
