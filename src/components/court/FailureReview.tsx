'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { type FailureReason, type Task } from '@/types';
import { buildRepairAction } from '@/lib/dailyProtocol';
import { Check } from 'lucide-react';

interface FailureReviewProps {
  tasks: Task[];
  failedTaskIds: string[];
  onSubmit: (failures: TaskFailure[], falseRest: boolean) => void;
  onBack: () => void;
}

export interface TaskFailure {
  taskId: string;
  reasonType: FailureReason['type'];
  couldDoMinimum: boolean;
  comment: string;
  repairAction: string;
}

const RESPECTFUL_REASON_KEYS: FailureReason['type'][] = [
  'serious_illness',
  'work_force_majeure',
  'family_emergency',
];

const BORDERLINE_REASON_KEYS: FailureReason['type'][] = [
  'minor_illness',
  'tired',
  'task_too_big',
  'bad_planning',
  'fear',
  'perfectionism',
];

const ACTION_PATTERN_REASON_KEYS: FailureReason['type'][] = [
  'lazy',
  'no_mood',
  'social_media',
  'games',
  'false_rest',
  'forgot',
  'learning_instead_action',
];

export function FailureReview({ tasks, failedTaskIds, onSubmit, onBack }: FailureReviewProps) {
  const [failures, setFailures] = useState<TaskFailure[]>(() =>
    failedTaskIds.map((id) => ({
      taskId: id,
      reasonType: 'unknown',
      couldDoMinimum: false,
      comment: '',
      repairAction: '',
    }))
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [falseRest, setFalseRest] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const reasonId = useId();
  const commentId = useId();
  const repairId = useId();
  const locale = useLocale();
  const t = useTranslations('failureReview');
  const tc = useTranslations('common');

  const activeFailure = failures[activeIndex];
  const activeTask = tasks.find((task) => task.id === activeFailure?.taskId);
  const isLast = activeIndex === failures.length - 1;
  const currentReady =
    !!activeFailure &&
    activeFailure.reasonType !== 'unknown' &&
    activeFailure.repairAction.trim().length > 0;

  const updateFailure = (taskId: string, patch: Partial<TaskFailure>) => {
    setFailures((previous) =>
      previous.map((failure) =>
        failure.taskId === taskId ? { ...failure, ...patch } : failure
      )
    );
  };

  const handleBack = () => {
    setShowValidation(false);
    if (activeIndex > 0) {
      setActiveIndex((index) => index - 1);
      return;
    }
    onBack();
  };

  const handleContinue = () => {
    if (!currentReady) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    if (!isLast) {
      setActiveIndex((index) => index + 1);
      return;
    }
    onSubmit(failures, falseRest);
  };

  if (!activeFailure || !activeTask) return null;

  return (
    <>
      <section className="tactile-card mb-6 p-5" aria-labelledby="failure-review-title">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-brand)]">
          {t('stepLabel', { current: activeIndex + 1, total: failures.length })}
        </p>
        <h2 id="failure-review-title" className="text-base font-semibold text-[var(--text-primary)]">
          {t('title')}
        </h2>
        <p className="mt-1 mb-5 text-xs leading-relaxed text-[var(--text-muted)]">
          {t('honesty')}
        </p>

        <div className="tactile-inset p-4">
          <p className="mb-4 text-sm font-medium leading-snug text-[var(--text-primary)]">
            {activeTask.title}
          </p>

          <div>
            <label htmlFor={reasonId} className="mb-1.5 block text-xs text-[var(--text-muted)]">
              {t('whyFailed')}
            </label>
            <select
              id={reasonId}
              value={activeFailure.reasonType}
              aria-invalid={showValidation && activeFailure.reasonType === 'unknown'}
              onChange={(event) => {
                const reasonType = event.target.value as FailureReason['type'];
                updateFailure(activeFailure.taskId, {
                  reasonType,
                  repairAction:
                    activeFailure.repairAction.trim() || buildRepairAction(reasonType, activeTask.title, locale === 'en' ? 'en' : 'ru'),
                });
                setShowValidation(false);
              }}
              className="tactile-field w-full px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
            >
              <option value="unknown" disabled>{t('selectReason')}</option>
              <optgroup label={t('groupRespectful')}>
                {RESPECTFUL_REASON_KEYS.map((key) => <option key={key} value={key}>{t(`reasons.${key}`)}</option>)}
              </optgroup>
              <optgroup label={t('groupBorderline')}>
                {BORDERLINE_REASON_KEYS.map((key) => <option key={key} value={key}>{t(`reasons.${key}`)}</option>)}
              </optgroup>
              <optgroup label={t('groupActionPattern')}>
                {ACTION_PATTERN_REASON_KEYS.map((key) => <option key={key} value={key}>{t(`reasons.${key}`)}</option>)}
              </optgroup>
            </select>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--text-muted)]">{t('reasonRequiredHint')}</p>
          </div>

          <button
            type="button"
            aria-pressed={activeFailure.couldDoMinimum}
            onClick={() => updateFailure(activeFailure.taskId, { couldDoMinimum: !activeFailure.couldDoMinimum })}

            className="selection-control mt-3 flex items-center gap-2 px-3 py-2 text-xs font-medium"
          >
            <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: activeFailure.couldDoMinimum ? 'var(--selection-color)' : 'var(--text-muted)', backgroundColor: activeFailure.couldDoMinimum ? 'var(--selection-color)' : 'transparent' }}>
              {activeFailure.couldDoMinimum && <Check className="text-[var(--text-inverse)]" size={12} strokeWidth={2.4} />}
            </span>
            {t('couldDoMinimum')}
          </button>

          <div className="mt-3">
            <label htmlFor={commentId} className="mb-1.5 block text-xs text-[var(--text-muted)]">{t('commentLabel')}</label>
            <textarea id={commentId} value={activeFailure.comment} onChange={(event) => updateFailure(activeFailure.taskId, { comment: event.target.value })} placeholder={t('commentPlaceholder')} className="tactile-field w-full resize-none px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-brand)]" rows={2} />
          </div>

          <div className="mt-3">
            <label htmlFor={repairId} className="mb-1.5 block text-xs text-[var(--text-muted)]">{t('repairActionLabel')}</label>
            <textarea id={repairId} value={activeFailure.repairAction} aria-invalid={showValidation && !activeFailure.repairAction.trim()} onChange={(event) => { updateFailure(activeFailure.taskId, { repairAction: event.target.value }); setShowValidation(false); }} placeholder={t('repairActionPlaceholder')} className="tactile-field w-full resize-none px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-brand)]" rows={2} />
          </div>

          {showValidation && !currentReady && (
            <p role="alert" className="mt-3 rounded-lg border border-[var(--state-risk-border)] bg-[var(--state-risk-soft)] px-3 py-2 text-xs text-[var(--state-risk)]">
              {t('reasonMissing')}
            </p>
          )}
        </div>

        {isLast && (
          <button type="button" aria-pressed={falseRest} onClick={() => setFalseRest((value) => !value)} className="selection-control mt-4 flex items-center gap-2 px-3 py-2 text-xs font-medium">
            <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: falseRest ? 'var(--selection-color)' : 'var(--text-muted)', backgroundColor: falseRest ? 'var(--selection-color)' : 'transparent' }}>
              {falseRest && <Check className="text-[var(--text-inverse)]" size={12} strokeWidth={2.4} />}
            </span>
            {t('falseRest')}
          </button>
        )}
      </section>

      <div className="flex gap-3">
        <button type="button" onClick={handleBack} className="tactile-button tactile-button-secondary flex-1 py-3 text-sm hover:bg-[var(--bg-hover)]">
          {activeIndex > 0 ? t('previousTask') : tc('back')}
        </button>
        <button type="button" onClick={handleContinue} className="tactile-button tactile-button-primary flex-1 py-3 text-sm hover:opacity-90">
          {isLast ? t('submit') : t('nextTask')}
        </button>
      </div>
    </>
  );
}
