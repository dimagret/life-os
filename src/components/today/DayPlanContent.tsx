'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { UserProfile, DayPlan, Task, RecoveryQuest } from '@/types';
import { loadDebts, loadGoals } from '@/lib/storage';
import { countFinishedDayTasks, isDayPlanReadyForCourt, isDayPlanTasksFinished } from '@/lib/dayPlan';
import { StabilizationMode } from '@/components/recovery/StabilizationMode';
import { DayCommandCenter } from '@/components/day/DayCommandCenter';
import { DailyPlan } from '@/components/day/DailyPlan';
import { Link } from '@/i18n/navigation';

function hasLegacyDoneText(text: string | undefined): boolean {
  return !!text && (/\bСделано:\s*/iu.test(text) || /\bDone:\s*/iu.test(text));
}

interface DayPlanContentProps {
  profile: UserProfile;
  dayPlan: DayPlan;
  tasks: Task[];
  recoveryQuests: RecoveryQuest[];
  dayFullyClosed: boolean;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onAddProof: (taskId: string, type: 'text' | 'link', value: string) => void;
  onCloseDayWithoutCourt: () => void;
  onStartFocus: (task: Task) => void;
  onCompleteQuest: (questId: string) => void;
  onCloseDebt: (debtId: string) => void;
  onExitStabilization: () => void;
  onSaveDayMicroGoal: (mainResult: string) => void;
}

export function DayPlanContent({
  profile,
  dayPlan,
  tasks,
  recoveryQuests,
  dayFullyClosed,
  onUpdateTask,
  onAddProof,
  onCloseDayWithoutCourt,
  onStartFocus,
  onCompleteQuest,
  onCloseDebt,
  onExitStabilization,
  onSaveDayMicroGoal,
}: DayPlanContentProps) {
  const t = useTranslations('today');
  const tDaily = useTranslations('dailyPlan');
  const tasksClosedCount = countFinishedDayTasks(tasks);
  const tasksFinished = isDayPlanTasksFinished(tasks);
  const tasksReadyForCourt = isDayPlanReadyForCourt(tasks);
  const softSkipAvailable =
    profile.strictnessMode === 'soft' &&
    tasksReadyForCourt &&
    !dayFullyClosed &&
    !tasks.some((task) => task.status === 'failed');
  const linkedGoal = useMemo(
    () => (dayPlan.goalId ? loadGoals().find((goal) => goal.id === dayPlan.goalId) : undefined),
    [dayPlan.goalId]
  );
  const weeklyGoalTitle = linkedGoal
    ? hasLegacyDoneText(linkedGoal.externalResult)
      ? linkedGoal.title
      : linkedGoal.externalResult || linkedGoal.title
    : undefined;
  const hasConfirmedOutput = tasks.some(
    (task) => task.type === 'output' && task.status === 'completed' && task.proof
  );

  return (
    <div className="space-y-4">
      {dayFullyClosed && (
        <div className="tactile-card border-[var(--state-border)] bg-[var(--state-soft)] p-4">
          <h2 className="text-sm font-semibold text-[var(--state-color)]">
            {t('dayClosed.title')}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('dayClosed.desc')}</p>
        </div>
      )}

      {profile.activeStabilization ? (
        <StabilizationMode
          profile={profile}
          dayPlan={dayPlan}
          recoveryQuests={recoveryQuests}
          debts={loadDebts()}
          courtCompleted={dayFullyClosed}
          onCompleteQuest={onCompleteQuest}
          onCloseDebt={onCloseDebt}
          onExitStabilization={onExitStabilization}
        />
      ) : (
        <DayCommandCenter
          dayPlan={dayPlan}
          tasks={tasks}
          weeklyGoalTitle={weeklyGoalTitle}
          tasksClosed={tasksClosedCount}
          tasksTotal={tasks.length}
          onSaveMainResult={onSaveDayMicroGoal}
          onStartFocus={onStartFocus}
        />
      )}

      {tasksReadyForCourt && !dayFullyClosed ? (
        <div className="space-y-2">
          <Link
            href="/action-court"
            className="tactile-button tactile-button-primary flex min-h-12 w-full items-center justify-center px-4 py-3 text-center text-sm font-semibold"
          >
            {t('goToCourt')}
          </Link>
          {softSkipAvailable && (
            <button
              type="button"
              onClick={onCloseDayWithoutCourt}
              className="tactile-button tactile-button-secondary min-h-11 w-full py-2.5 text-xs hover:bg-[var(--bg-hover)]"
            >
              {t('skipCourtSoft')}
            </button>
          )}
        </div>
      ) : null}

      <details className="today-task-details tactile-card">
        <summary>
          <span className="today-task-summary-copy">
            <strong>{tDaily('detailsTitle')}</strong>
            <small>{tDaily('detailsHint')}</small>
          </span>
          <span className="today-task-summary-progress">
            {tasksClosedCount}/{tasks.length}
          </span>
        </summary>
        <div className="today-task-details-content">
          <DailyPlan
            tasks={tasks}
            onUpdateTask={onUpdateTask}
            onAddProof={onAddProof}
            onStartFocus={onStartFocus}
          />

          {hasConfirmedOutput && (
            <div className="rounded-xl border border-[var(--state-victory-border)] bg-[var(--state-victory-soft)] p-4">
              <p className="text-center text-sm font-medium text-[var(--state-victory)]">
                {t('resultFixed')}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-4">
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('recoveryNote')}</p>
          </div>

          {dayFullyClosed ? (
            <Link
              href="/action-court"
              className="tactile-button tactile-button-secondary flex min-h-11 w-full items-center justify-center px-4 py-3 text-center text-sm font-medium"
            >
              {t('courtPassed')}
            </Link>
          ) : !tasksReadyForCourt ? (
            <div aria-disabled="true" className="rounded-xl border border-[var(--border-subtle)] p-4 text-center opacity-80">
              <span className="text-sm font-medium text-[var(--text-muted)]">
                {tasksFinished ? t('courtLockedProof') : t('courtLocked')}
              </span>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
