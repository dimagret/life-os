'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { StateSwitcher } from '@/components/StateSwitcher';
import {
  bootstrapApp,
  resetAllData,
  snapshotAllStorage,
  restoreSnapshot,
  loadDayPlans,
  loadActionCourtReviews,
  type StorageSnapshot,
} from '@/lib/storage';
import { FocusBlock as FocusBlockRecord, Task } from '@/types';
import {
  getTodayDate,
  stripLegacyTodayFromTaskTitle,
  stripTrajectoryContextPrefix,
} from '@/lib/utils';
import { buildMentorDayBrief } from '@/lib/mentorBrief';
import {
  countFinishedDayTasks,
  getPathDayOrdinal,
  isDayOrderBlown,
  isDayPlanTasksFinished,
  isTaskFinishedForDay,
} from '@/lib/dayPlan';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useShell } from '@/lib/shell-context';
import { FocusBlock } from '@/components/day/FocusBlock';
import { UsefulRest } from '@/components/day/UsefulRest';
import {
  FocusAccountabilityDeepScreen,
  FocusReflectionScreen,
  FocusOptionalCommentScreen,
} from '@/components/day/FocusSessionFollowup';
import { ConfirmInline } from '@/components/ui/ConfirmInline';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Toast } from '@/components/ui/Toast';
import { CalendarDays, CalendarX, ChevronDown } from 'lucide-react';
import { useTodayData } from '@/hooks/useTodayData';
import { useTodaySession } from '@/hooks/useTodaySession';
import { useMentorGeneration } from '@/hooks/useMentorGeneration';
import { MentorChat } from '@/components/today/MentorChat';
import { GoalsList } from '@/components/today/GoalsList';
import { SessionForm } from '@/components/today/SessionForm';
import { DayPlanContent } from '@/components/today/DayPlanContent';
import { YesterdayReviewCard } from '@/components/today/YesterdayReviewCard';
import { TodayMetrics } from '@/components/today/TodayMetrics';
import styles from './Today.module.css';

function resolveFocusMicroGoal(task: Task): string {
  return (
    task.microGoal?.trim() ||
    stripTrajectoryContextPrefix(task.description) ||
    stripLegacyTodayFromTaskTitle(task.title)
  );
}

export default function TodayClient() {
  const t = useTranslations('today');
  const tState = useTranslations('stateLabels');
  const tRest = useTranslations('rest');
  const { currentState, setCurrentState, setHideShell } = useShell();

  const {
    profile,
    debtsCount,
    hasGoals,
    dayPlan,
    tasks,
    courtCompleted,
    recoveryQuests,
    yesterdayReview,
    loadData,
    creatingDayPlan,
    handleCreateDayPlan,
    handleUpdateTask,
    handleAddProof,
    handleCloseDayWithoutCourt,
    handleCompleteRecoveryQuest,
    handleCloseDebt,
    handleExitStabilization,
    handleSaveDayMicroGoal,
  } = useTodayData();

  const mentorDayBrief = useMemo(
    () => buildMentorDayBrief(dayPlan, tasks),
    [dayPlan, tasks]
  );
  const courtHistoryCount = useMemo(
    () => loadActionCourtReviews().length,
    [courtCompleted, dayPlan?.date, tasks.length]
  );

  const { mentorTip, mentorTipSource } = useMentorGeneration(profile, {
    dayBrief: mentorDayBrief,
    courtHistoryCount,
  });

  const {
    activeFocusTask,
    postFocus,
    resetSession,
    handleStartFocus,
    handleFocusComplete,
    handleFocusFail,
    advanceRestToOptionalComment,
    handleAccountabilitySubmit,
    handleReflectionSubmit,
    handleOptionalCommentSubmit,
  } = useTodaySession();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<StorageSnapshot | null>(null);
  const [showNewDayBadge, setShowNewDayBadge] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [taskReminderMessage, setTaskReminderMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    function init() {
      try {
        const app = bootstrapApp();
        if (!isActive) return;
        setCurrentState(app.currentState);
        const needsOnboarding = !app.profile.onboardingCompleted;
        setShowOnboarding(needsOnboarding);
        setHideShell(needsOnboarding);
        if (!needsOnboarding) loadData();
      } catch (e) {
        console.error('[Life OS] bootstrap/loadTodayData failed:', e);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    init();
    return () => { isActive = false; };
  }, [loadData, setCurrentState, setHideShell]);

  useEffect(() => {
    if (isLoading || showOnboarding) return;
    let isActive = true;
    function checkNewDay() {
      try {
        const key = 'lifeos:lastSeenUiDay';
        const today = getTodayDate();
        const prev = sessionStorage.getItem(key);
        if (isActive && prev !== today) {
          setShowNewDayBadge(true);
          sessionStorage.setItem(key, today);
        }
      } catch {
        /* ignore */
      }
    }
    checkNewDay();
    return () => { isActive = false; };
  }, [isLoading, showOnboarding, clockTick]);

  useEffect(() => {
    if (!showNewDayBadge) return;
    const timer = window.setTimeout(() => setShowNewDayBadge(false), 15000);
    return () => window.clearTimeout(timer);
  }, [showNewDayBadge]);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((n) => n + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!profile?.taskReminderEnabled || !dayPlan || courtCompleted) return;
    const intervalMinutes = Math.min(Math.max(profile.taskReminderMinutes ?? 60, 5), 240);
    const id = window.setInterval(() => {
      const openTasks = tasks.filter((task) => !isTaskFinishedForDay(task));
      if (openTasks.length > 0) {
        setTaskReminderMessage(t('toast.unfinishedTasks', { count: openTasks.length }));
      }
    }, intervalMinutes * 60 * 1000);
    return () => window.clearInterval(id);
  }, [
    profile?.taskReminderEnabled,
    profile?.taskReminderMinutes,
    dayPlan,
    courtCompleted,
    tasks,
    t,
  ]);

  const locale = useLocale();
  const headerDateLine = useMemo(() => {
    const lang = locale.startsWith('en') ? 'en-US' : 'ru-RU';
    return new Intl.DateTimeFormat(lang, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, [locale, clockTick]);

  const reloadFromStorage = () => {
    const app = bootstrapApp();
    setCurrentState(app.currentState);
    const needsOnboarding = !app.profile.onboardingCompleted;
    setShowOnboarding(needsOnboarding);
    setHideShell(needsOnboarding);
    resetSession();
    if (!needsOnboarding) loadData();
  };

  const handleOnboardingComplete = (firstTask: Task) => {
    setShowOnboarding(false);
    setHideShell(false);
    loadData();
    handleStartFocus(firstTask);
  };

  const handleReset = () => {
    const snapshot = snapshotAllStorage();
    resetAllData();
    setUndoSnapshot(snapshot);
    reloadFromStorage();
    setShowResetConfirm(false);
  };

  const handleUndoReset = () => {
    if (!undoSnapshot) return;
    restoreSnapshot(undoSnapshot);
    setUndoSnapshot(null);
    reloadFromStorage();
  };

  if (isLoading) return <PageSkeleton />;
  if (showOnboarding) return <OnboardingFlow onComplete={handleOnboardingComplete} />;

  if (activeFocusTask) {
    const focusMainMicro = resolveFocusMicroGoal(activeFocusTask);
    const completeFocusedTask = (block: FocusBlockRecord) => {
      const task = activeFocusTask;
      handleFocusComplete(block);
      handleUpdateTask(task.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      if (block.result?.trim() && !task.proof) {
        handleAddProof(task.id, 'text', block.result.trim());
      }
    };
    const failFocusedTask = (block: FocusBlockRecord) => {
      const task = activeFocusTask;
      handleFocusFail(block);
      handleUpdateTask(task.id, { status: 'failed', completedAt: undefined });
    };
    return (
      <FocusBlock
        key={activeFocusTask.id}
        taskTitle={activeFocusTask.title}
        dayMicroGoal={focusMainMicro}
        microGoalScope="stage"
        taskDetail={activeFocusTask.description}
        taskType={activeFocusTask.type}
        taskId={activeFocusTask.id}
        onComplete={completeFocusedTask}
        onFail={failFocusedTask}
        onCancel={() => resetSession()}
      />
    );
  }

  if (postFocus?.phase === 'accountabilityDeep') {
    return (
      <FocusAccountabilityDeepScreen
        onSubmit={(answers) => handleAccountabilitySubmit(postFocus.blockId, answers)}
      />
    );
  }

  if (postFocus?.phase === 'reflect') {
    return (
      <FocusReflectionScreen
        onSubmit={(reflection) => handleReflectionSubmit(postFocus.blockId, reflection)}
      />
    );
  }

  if (postFocus?.phase === 'optionalComment') {
    return (
      <FocusOptionalCommentScreen
        onSubmit={(text) => handleOptionalCommentSubmit(postFocus.blockId, text)}
      />
    );
  }

  if (postFocus?.phase === 'rest') {
    return (
      <UsefulRest
        recoveryMinutesHint={
          postFocus.showRecoveryHint
            ? postFocus.lostFocusHeavy
              ? tRest('shortRecovery10')
              : tRest('shortRecovery5')
            : undefined
        }
        skipButtonLabel={tRest('continueSession')}
        onComplete={advanceRestToOptionalComment}
        onSkip={advanceRestToOptionalComment}
      />
    );
  }

  const stateLabel = tState(currentState);
  const todayStr = getTodayDate();
  const pathDayOrdinal =
    profile && dayPlan ? getPathDayOrdinal(todayStr, loadDayPlans()) : null;
  const planTasksFinished = isDayPlanTasksFinished(tasks);
  const dayFullyClosed = courtCompleted && planTasksFinished;
  const showDayBlown = dayPlan ? isDayOrderBlown(dayPlan, tasks) : false;
  const tasksClosedCount = countFinishedDayTasks(tasks);
  const xpInSegment = profile !== null ? profile.totalXp % 200 : 0;

  const summaryStats = profile
    ? [
        { label: t('summary.level', { n: profile.level }), value: t('summary.xpSegment', { current: xpInSegment, next: profile.level + 1 }) },
        ...(pathDayOrdinal !== null
          ? [{ label: t('summary.pathDay', { n: pathDayOrdinal }), value: todayStr }]
          : []),
        ...(dayPlan && tasks.length > 0
          ? [{ label: t('summary.planClosed', { closed: tasksClosedCount, total: tasks.length }), value: `${tasksClosedCount}/${tasks.length}` }]
          : []),
      ]
    : [];

  return (
    <div className={`app-page ${styles.shell}`}>
      <header className={styles.todayHeader}>
        <div className={styles.todayHeaderMain}>
          <div className={styles.titleRow}>
            <h1>{t('title')}</h1>
            {showDayBlown && (
              <span
                className={styles.dayBlownBadge}
                title={t('dayBlownBadge')}
              >
                <CalendarX className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{t('dayBlownBadge')}</span>
              </span>
            )}
            {!showDayBlown && showNewDayBadge && (
              <span
                className={styles.newDayBadge}
                title={t('newDayBadge')}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{t('newDayBadge')}</span>
              </span>
            )}
          </div>
          <p className={styles.todayDate}>{headerDateLine}</p>
        </div>
        <div className={styles.stateControl}>
          <StateSwitcher />
        </div>
      </header>

      {!hasGoals ? (
        <GoalsList />
      ) : !dayPlan ? (
        <SessionForm onCreateDayPlan={handleCreateDayPlan} loading={creatingDayPlan} />
      ) : (
        <DayPlanContent
          profile={profile!}
          dayPlan={dayPlan}
          tasks={tasks}
          recoveryQuests={recoveryQuests}
          dayFullyClosed={dayFullyClosed}
          onUpdateTask={handleUpdateTask}
          onAddProof={handleAddProof}
          onCloseDayWithoutCourt={handleCloseDayWithoutCourt}
          onStartFocus={handleStartFocus}
          onCompleteQuest={handleCompleteRecoveryQuest}
          onCloseDebt={handleCloseDebt}
          onExitStabilization={handleExitStabilization}
          onSaveDayMicroGoal={handleSaveDayMicroGoal}
        />
      )}

      <details className={styles.secondaryDetails}>
        <summary className={styles.secondarySummary}>
          <span className={styles.secondarySummaryCopy}>
            <strong>{t('secondary.title')}</strong>
            <small>{t('secondary.hint')}</small>
          </span>
          <ChevronDown className={styles.secondaryChevron} size={17} aria-hidden="true" />
        </summary>
        <div className={styles.secondaryContent}>
          <MentorChat
            mentorTip={mentorTip}
            mentorTipSource={mentorTipSource}
            stateLabel={stateLabel}
            currentState={currentState}
          />

          {yesterdayReview && <YesterdayReviewCard review={yesterdayReview} />}

          {profile && <TodayMetrics profile={profile} debtsCount={debtsCount} />}

          {profile && summaryStats.length > 0 && (
            <div className="stat-strip grid grid-cols-2 gap-2 p-2">
              {summaryStats.map((item) => (
                <div key={`${item.label}-${item.value}`} className="stat-pill px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {showResetConfirm ? (
            <ConfirmInline
              open={showResetConfirm}
              message={t('confirms.resetMessage')}
              confirmLabel={t('confirms.resetConfirm')}
              cancelLabel={t('confirms.cancel')}
              onConfirm={handleReset}
              onCancel={() => setShowResetConfirm(false)}
            />
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className={styles.resetButton}
            >
              {t('actions.resetDemo')}
            </button>
          )}
        </div>
      </details>

      <Toast
        open={undoSnapshot !== null}
        message={t('toast.dataReset')}
        actionLabel={t('toast.restore')}
        onAction={handleUndoReset}
        onDismiss={() => setUndoSnapshot(null)}
        durationMs={5000}
      />
      <Toast
        open={undoSnapshot === null && taskReminderMessage !== null}
        message={taskReminderMessage}
        actionLabel={t('toast.reminderDismiss')}
        onAction={() => setTaskReminderMessage(null)}
        onDismiss={() => setTaskReminderMessage(null)}
        durationMs={8000}
      />
    </div>
  );
}




