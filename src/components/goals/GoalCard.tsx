'use client';

import { FormEvent, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Goal } from '@/types';
import { Link } from '@/i18n/navigation';
import { formatGoalCalendarDate } from '@/lib/goalCalendar';
import { getGoalDisplayTimeline } from '@/lib/goalDisplayTimeline';
import styles from './GoalCard.module.css';

interface GoalCardProps {
  goal: Goal;
  hasTodayPlan?: boolean;
  onUpdate?: (patch: Pick<Goal, 'title' | 'externalResult'>) => void;
}

type GoalStatusPresentation = Goal['status'] | 'closed' | 'unknown';

const GOAL_STATUS_KEYS: Record<GoalStatusPresentation, string> = {
  active: 'status.active',
  paused: 'status.paused',
  completed: 'status.completed',
  failed: 'status.failed',
  closed: 'status.closed',
  unknown: 'status.unknown',
};

const GOAL_STATUS_STYLES: Record<GoalStatusPresentation, string> = {
  active: 'border-[var(--state-border)] bg-[var(--state-soft)] text-[var(--state-color)]',
  paused: 'border-[var(--state-hold)] bg-[var(--state-hold-soft)] text-[var(--state-hold)]',
  completed: 'border-[var(--state-victory-border)] bg-[var(--state-victory-soft)] text-[var(--state-victory)]',
  failed: 'border-[var(--state-deception)] bg-[var(--state-deception-soft)] text-[var(--state-deception)]',
  closed: 'border-[var(--state-victory-border)] bg-[var(--state-victory-soft)] text-[var(--state-victory)]',
  unknown: 'border-[var(--border-subtle)] bg-[var(--bg-hover)] text-[var(--text-muted)]',
};

function resolveGoalStatus(value: unknown): GoalStatusPresentation {
  switch (value) {
    case 'active':
    case 'paused':
    case 'completed':
    case 'failed':
    case 'closed':
      return value;
    default:
      return 'unknown';
  }
}

export function GoalCard({ goal, hasTodayPlan = false, onUpdate }: GoalCardProps) {
  const t = useTranslations('goalCard');
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(goal.title);
  const [externalResultDraft, setExternalResultDraft] = useState(goal.externalResult);
  const horizon = goal.horizon ?? 'weekly';
  const goalStatus = resolveGoalStatus((goal as { status?: unknown }).status);
  const timeline = getGoalDisplayTimeline(goal);
  const deadlineTiming = timeline.overdueDays > 0
    ? t('overdueBy', { days: timeline.overdueDays })
    : timeline.isDueToday
      ? t('deadlineToday')
      : t('daysUntilDeadline', { days: timeline.daysUntilDeadline });
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedTitle = normalize(goal.title);
  const normalizedOriginal = normalize(goal.originalInput);
  const repeatsOriginal =
    normalizedTitle === normalizedOriginal ||
    (normalizedTitle.length > 24 && normalizedOriginal.includes(normalizedTitle)) ||
    (normalizedOriginal.length > 24 && normalizedTitle.includes(normalizedOriginal));

  const startEditing = () => {
    setTitleDraft(goal.title);
    setExternalResultDraft(goal.externalResult);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setTitleDraft(goal.title);
    setExternalResultDraft(goal.externalResult);
    setIsEditing(false);
  };

  const saveEditing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = titleDraft.trim();
    const externalResult = externalResultDraft.trim();
    if (!title || !externalResult) return;

    onUpdate?.({ title, externalResult });
    setIsEditing(false);
  };

  return (
    <article className={styles.card}>
      <div className={`flex items-center justify-between gap-2 ${styles.topline}`}>
        <span className={styles.kicker}>
          {t('horizon.' + horizon)}
        </span>
        <div className={styles.toplineActions}>
          {onUpdate && goalStatus === 'active' && (
            <button type="button" className={styles.editButton} onClick={startEditing}>
              {t('edit')}
            </button>
          )}
          <span
            className={styles.statusChip + ' shrink-0 border ' + GOAL_STATUS_STYLES[goalStatus]}
          >
            {t(GOAL_STATUS_KEYS[goalStatus])}
          </span>
        </div>
      </div>

      {!isEditing && (
        <>
          {!repeatsOriginal && (
            <h2 className={styles.title}>
              {goal.title}
            </h2>
          )}

          <p className={styles.description}>
            {goal.originalInput}
          </p>
        </>
      )}

      {goalStatus === 'active' && (
        <div className="mb-4">
          <div className="flex justify-between items-center gap-3 mb-2">
            <span className="text-xs tabular-nums text-[var(--text-muted)]">
              {t('calendarDayProgress', {
                current: timeline.currentCalendarDay,
                total: timeline.totalCalendarDays,
              })}
            </span>
            <span
              className={
                'text-right text-xs tabular-nums ' +
                (timeline.overdueDays > 0
                  ? 'text-[var(--state-deception)]'
                  : 'text-[var(--text-muted)]')
              }
            >
              {deadlineTiming}
            </span>
          </div>
          <div
            className="progress-track h-2.5 w-full"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={timeline.totalCalendarDays}
            aria-valuenow={timeline.currentCalendarDay}
            aria-label={t('calendarDayProgress', {
              current: timeline.currentCalendarDay,
              total: timeline.totalCalendarDays,
            })}
          >
            <div
              className="progress-fill h-full transition-all"
              style={{ width: timeline.progressPercent + '%' }}
            />
          </div>
        </div>
      )}

      {isEditing ? (
        <form className={styles.editForm} onSubmit={saveEditing}>
          <label className={styles.editField}>
            <span className={styles.insetLabel}>{t('editGoalLabel')}</span>
            <textarea
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              className={styles.editTextarea}
              rows={3}
              required
            />
          </label>
          <label className={styles.editField}>
            <span className={styles.insetLabel}>{t('externalResult')}</span>
            <textarea
              value={externalResultDraft}
              onChange={(event) => setExternalResultDraft(event.target.value)}
              className={styles.editTextarea}
              rows={2}
              required
            />
          </label>
          <div className={styles.editActions}>
            <button type="button" className={styles.cancelButton} onClick={cancelEditing}>
              {t('cancelEdit')}
            </button>
            <button type="submit" className={styles.saveButton}>
              {t('saveEdit')}
            </button>
          </div>
        </form>
      ) : (
        <div className="tactile-inset mb-3 p-3">
          <span className={styles.insetLabel}>
            {t('externalResult')}
          </span>
          <p className={styles.insetCopy}>{goal.externalResult}</p>
        </div>
      )}

      <div className="grid grid-cols-2 items-start gap-4 mb-4">
        <div>
          <span className="text-xs text-[var(--text-muted)]">{t('realism')}</span>
          <span className={styles.realismScore}>
            {goal.realismScore}/100
          </span>
        </div>
        <div className="text-right">
          <span className="block text-xs text-[var(--text-muted)]">{t('deadline')}</span>
          <span className="text-sm tabular-nums text-[var(--text-primary)]">
            {formatGoalCalendarDate(timeline.deadlineDate, locale)}
          </span>
        </div>
      </div>

      {goalStatus === 'active' && (
        <div className="tactile-inset mb-4 p-3">
          <span className={styles.insetLabel}>
            {t('nextStep')}
          </span>
          <p className={styles.insetCopy}>
            {hasTodayPlan ? t('todayPlanReady') : t('createDayOrder')}
          </p>
        </div>
      )}

      {goalStatus === 'active' && (
        <Link
          href="/"
          className={
            styles.primaryAction +
            (horizon === 'weekly' ? '' : ' ' + styles.secondaryAction)
          }
        >
          <span>{t('goToToday')}</span>
          <span className={styles.actionIcon} aria-hidden="true">→</span>
        </Link>
      )}
    </article>
  );
}

