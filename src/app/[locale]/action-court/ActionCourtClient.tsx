'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  getTodayPlan,
  getTasksByIds,
  loadUserProfile,
  saveUserProfile,
  loadActionCourtReviews,
  saveActionCourtReviews,
  createDebt,
  updateDayPlan,
  updateTask,
  createRecoveryQuest,
  loadDebts,
  loadRecoveryQuests,
  loadFocusBlocks,
} from '@/lib/storage';
import { shouldEnterStabilization, generateMentorMessage } from '@/lib/mockMentor';
import { generateMentorMessageAsync } from '@/lib/aiMentor';
import { buildMentorDayBrief } from '@/lib/mentorBrief';
import { generateId } from '@/lib/utils';
import { formatVerdictSessionDate, buildVerdictTaskOutcomes } from '@/lib/verdictDisplay';
import { buildVerdictSessionSnapshot, taskStatusesFromVerdictResult } from '@/lib/verdictSession';
import { buildTomorrowAdjustment } from '@/lib/tomorrowAdjustment';
import { ActionCourt, VerdictResult } from '@/components/court/ActionCourt';
import { VerdictScreen } from '@/components/court/VerdictScreen';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { shouldRepairLegacyTask } from '@/hooks/useTodayData';
import type { ActionCourtReview } from '@/types';

export default function ActionCourtClient() {
  const t = useTranslations('court');
  const tToday = useTranslations('today');
  const tNextStep = useTranslations('verdict.nextStep');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [dayPlan, setDayPlan] = useState(getTodayPlan());
  const [tasks, setTasks] = useState(getTasksByIds(dayPlan?.taskIds || []));
  const [profile, setProfile] = useState(loadUserProfile());
  const [verdictResult, setVerdictResult] = useState<VerdictResult | null>(null);

  useEffect(() => {
    let isActive = true;
    function loadInitialData() {
      const plan = getTodayPlan();
      const userProfile = loadUserProfile();
      let todayTasks = plan ? getTasksByIds(plan.taskIds) : [];

      let repairedLegacyTitle = false;
      todayTasks = todayTasks.map((task) => {
        if (!shouldRepairLegacyTask(task)) return task;
        repairedLegacyTitle = true;
        const title =
          task.type === 'learning'
            ? tToday('dailyTrajectoryFallback.learningTitle')
            : task.type === 'practice'
              ? tToday('dailyTrajectoryFallback.practiceTitle')
              : tToday('dailyTrajectoryFallback.outputTitle');
        return updateTask(task.id, { title }) ?? { ...task, title };
      });
      if (plan && repairedLegacyTitle) {
        todayTasks = getTasksByIds(plan.taskIds);
      }

      if (!isActive) return;
      setProfile(userProfile);

      // Check if this exact day plan already has a saved court review.
      const reviews = loadActionCourtReviews();
      const todayReview = plan ? reviews.find((r) => r.dayPlanId === plan.id) : undefined;
      if (todayReview && plan) {
        const closedPlan = plan.status === 'closed'
          ? plan
          : updateDayPlan(plan.id, { status: 'closed' }) ?? plan;
        const statusByTaskId = new Map<string, 'completed' | 'partial' | 'failed'>();
        todayReview.completedTaskIds.forEach((id) => statusByTaskId.set(id, 'completed'));
        todayReview.partialTaskIds.forEach((id) => statusByTaskId.set(id, 'partial'));
        todayReview.failedTaskIds.forEach((id) => statusByTaskId.set(id, 'failed'));
        todayTasks.forEach((task) => {
          const status = statusByTaskId.get(task.id);
          if (status && task.status !== status) {
            updateTask(task.id, { status });
          }
        });
        todayTasks = getTasksByIds(closedPlan.taskIds);
        setDayPlan(closedPlan);
        setTasks(todayTasks);

        const eventType =
          todayReview.verdict === 'self_victory' ||
          todayReview.verdict === 'recovered_victory'
            ? 'victory'
            : todayReview.verdict === 'self_deception'
              ? 'self_deception'
              : 'task_failed';
        // Start with mock message for immediate render
        const mockMsg = generateMentorMessage({
          mode: userProfile.strictnessMode,
          event: eventType,
          verdict: todayReview.verdict,
          abyssIndex: userProfile.abyssIndex,
          innerCore: userProfile.innerCore,
          dayBrief: buildMentorDayBrief(closedPlan, todayTasks),
          courtHistoryCount: loadActionCourtReviews().length,
        });

      const allDebts = loadDebts();
      let debtTypeFromStorage: string | undefined;
      if (todayReview.debtIds.length > 0) {
        const debt = allDebts.find((db) => todayReview.debtIds.includes(db.id));
        debtTypeFromStorage = debt?.type;
      }

      let recoveryFromStorage: VerdictResult['recoveryQuest'] = null;
      if (todayReview.recoveryQuestId) {
        const quests = loadRecoveryQuests();
        const q = quests.find((x) => x.id === todayReview.recoveryQuestId);
        if (q) {
          recoveryFromStorage = {
            title: q.title,
            description: q.description,
            xpRestore: q.xpRestore,
            innerCoreReward: q.innerCoreReward,
            abyssReduction: q.abyssReduction,
            status: 'planned',
          };
        }
      }

      const failuresLoaded = (todayReview.failuresDetail ?? []).map((f) => ({
        taskId: f.taskId,
        reasonType: f.reasonType,
        couldDoMinimum: f.couldDoMinimum,
        comment: f.comment,
        repairAction: f.repairAction ?? '',
      }));

      const snapshotLoaded =
        todayReview.verdictSessionSnapshot ??
        buildVerdictSessionSnapshot({
          verdict: todayReview.verdict,
          dayPlan: closedPlan,
          tasks: todayTasks,
          taskStatuses: taskStatusesFromVerdictResult(
            todayTasks,
            todayReview.completedTaskIds,
            todayReview.partialTaskIds,
            todayReview.failedTaskIds
          ),
          failures: failuresLoaded,
          focusBlocks: loadFocusBlocks(),
        });

      const storedMentorMessage = todayReview.displaySnapshot?.mentorMessage;

      setVerdictResult({
        verdict: todayReview.verdict,
        xpDelta: todayReview.xpDelta,
        innerCoreDelta: todayReview.innerCoreDelta,
        abyssIndexDelta: todayReview.abyssIndexDelta,
        mentorMessage: storedMentorMessage ?? mockMsg,
        debtCreated: todayReview.debtIds.length > 0,
        debtType: todayReview.displaySnapshot?.debtType ?? debtTypeFromStorage,
        recoveryQuest: todayReview.displaySnapshot?.recoveryQuest
          ? { ...todayReview.displaySnapshot.recoveryQuest, status: 'planned' }
          : recoveryFromStorage,
        stabilizationTriggered: userProfile.activeStabilization,
        updatedProfile: userProfile,
        completedTaskIds: todayReview.completedTaskIds,
        failedTaskIds: todayReview.failedTaskIds,
        partialTaskIds: todayReview.partialTaskIds,
        falseRestDetected: todayReview.falseRestDetected,
        failures: failuresLoaded,
        verdictSessionSnapshot: snapshotLoaded,
        tomorrowAdjustment: todayReview.displaySnapshot?.tomorrowAdjustment ?? closedPlan.tomorrowAdjustment,
      });
      // Enhance legacy reviews without a stored message in the background.
      if (!storedMentorMessage) generateMentorMessageAsync({
        mode: userProfile.strictnessMode,
        event: eventType,
        verdict: todayReview.verdict,
        abyssIndex: userProfile.abyssIndex,
        innerCore: userProfile.innerCore,
        dayBrief: buildMentorDayBrief(closedPlan, todayTasks),
        courtHistoryCount: loadActionCourtReviews().length,
      }, userProfile.voiceTone).then((aiMsg) => {
        setVerdictResult((prev) =>
          prev
            ? {
                ...prev,
                mentorMessage: aiMsg,
              }
            : null
        );
      });
    } else {
      setDayPlan(plan);
      setTasks(todayTasks);
    }

      setIsLoading(false);
    }
    loadInitialData();
    return () => { isActive = false; };
  }, [tToday]);

  const handleVerdictCalculated = (result: VerdictResult) => {
    if (!dayPlan) return;

    // Save updated profile
    saveUserProfile(result.updatedProfile);

    // Update task statuses
    result.completedTaskIds.forEach((id) => {
      updateTask(id, { status: 'completed', completedAt: new Date().toISOString() });
    });
    result.partialTaskIds.forEach((id) => {
      updateTask(id, { status: 'partial' });
    });
    result.failedTaskIds.forEach((id) => {
      updateTask(id, { status: 'failed' });
    });

    setTasks(getTasksByIds(dayPlan.taskIds));

    // Create open commitments
    const debtIds: string[] = [];
    if (result.debtCreated && result.debtType) {
      const bossTask = tasks.find((t) => t.id === dayPlan.bossTaskId);
      const failedTask = tasks.find((t) => result.failedTaskIds.includes(t.id));
      const debtTitle = result.debtType === 'systemic'
        ? 'Системное незакрытое обещание: повторяющийся паттерн'
        : result.failedTaskIds.includes(dayPlan.bossTaskId || '')
          ? `Незакрытое обещание: главный результат "${bossTask?.title || 'неизвестно'}"`
          : `Незакрытое обещание по задаче "${failedTask?.title || 'неизвестно'}"`;

      const debt = createDebt({
        title: debtTitle,
        type: result.debtType as 'small' | 'medium' | 'critical' | 'systemic',
        status: 'open',
      });
      debtIds.push(debt.id);
    }

    // Every failure/self-deception gets a recovery path. No completed task is required.
    let recoveryQuestId: string | undefined;
    if (result.recoveryQuest) {
      const quest = createRecoveryQuest({
        title: result.recoveryQuest.title,
        description: result.recoveryQuest.description,
        xpRestore: result.recoveryQuest.xpRestore,
        innerCoreReward: result.recoveryQuest.innerCoreReward,
        abyssReduction: result.recoveryQuest.abyssReduction,
        status: 'planned',
      });
      recoveryQuestId = quest.id;
    }

    const tomorrowAdjustment = buildTomorrowAdjustment({
      failures: result.failures,
      sessionSnapshot: result.verdictSessionSnapshot,
      messages: {
        tomorrow: tNextStep('tomorrow'),
        split: tNextStep('split'),
        recovery: tNextStep('recovery'),
        capture_reason: tNextStep('capture_reason'),
      },
    });

    // Save review with an immutable display snapshot for future history pages.
    const review: ActionCourtReview = {
      id: generateId('review'),
      date: dayPlan.date,
      dayPlanId: dayPlan.id,
      completedTaskIds: result.completedTaskIds,
      failedTaskIds: result.failedTaskIds,
      partialTaskIds: result.partialTaskIds,
      falseRestDetected: result.falseRestDetected,
      verdict: result.verdict,
      xpDelta: result.xpDelta,
      innerCoreDelta: result.innerCoreDelta,
      abyssIndexDelta: result.abyssIndexDelta,
      debtIds,
      recoveryQuestId,
      createdAt: new Date().toISOString(),
      failuresDetail: result.failures.map((f) => ({
        taskId: f.taskId,
        reasonType: f.reasonType,
        couldDoMinimum: f.couldDoMinimum,
        comment: f.comment,
        repairAction: f.repairAction,
      })),
      verdictSessionSnapshot: result.verdictSessionSnapshot,
      displaySnapshot: {
        mentorMessage: result.mentorMessage,
        mainResult: dayPlan.mainResult,
        weeklyTrajectory: dayPlan.weeklyTrajectory,
        tomorrowAdjustment,
        debtType: result.debtType as 'small' | 'medium' | 'critical' | 'systemic' | undefined,
        recoveryQuest: result.recoveryQuest
          ? {
              title: result.recoveryQuest.title,
              description: result.recoveryQuest.description,
              xpRestore: result.recoveryQuest.xpRestore,
              innerCoreReward: result.recoveryQuest.innerCoreReward,
              abyssReduction: result.recoveryQuest.abyssReduction,
            }
          : null,
      },
    };

    const allReviews = loadActionCourtReviews();
    allReviews.push(review);

    // Check stabilization with the current review included.
    const debts = loadDebts();
    const shouldStabilize = shouldEnterStabilization(
      result.updatedProfile,
      debts,
      allReviews
    );

    if (shouldStabilize) {
      const stabilizedProfile = { ...result.updatedProfile, activeStabilization: true };
      saveUserProfile(stabilizedProfile);
      result.updatedProfile = stabilizedProfile;
      result.stabilizationTriggered = true;
    }

    saveActionCourtReviews(allReviews);

    // Close day plan and carry one concrete correction into the next day.
    updateDayPlan(dayPlan.id, {
      status: 'closed',
      tomorrowAdjustment,
    });
    result.tomorrowAdjustment = tomorrowAdjustment;

    setVerdictResult({
      ...result,
      recoveryQuest: result.recoveryQuest,
    });
    setProfile(result.updatedProfile);
  };

  const sessionDateLabel = useMemo(() => {
    if (!dayPlan) return undefined;
    return formatVerdictSessionDate(dayPlan.date, locale);
  }, [dayPlan, locale]);

  const taskOutcomes = useMemo(() => {
    if (!verdictResult || tasks.length === 0) return undefined;
    return buildVerdictTaskOutcomes(
      tasks,
      verdictResult.completedTaskIds,
      verdictResult.partialTaskIds,
      verdictResult.failedTaskIds
    );
  }, [verdictResult, tasks]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!dayPlan) {
    return (
      <div className="app-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{t('noOrder')}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {t('noOrderDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="tactile-button tactile-button-primary inline-flex items-center justify-center px-6 py-3 text-sm hover:opacity-90"
            >
              {t('returnToCenter')}
            </Link>
            <Link
              href="/action-court/history"
              className="tactile-button tactile-button-secondary inline-flex items-center justify-center px-6 py-3 text-sm hover:bg-[var(--bg-hover)]"
            >
              {t('historyLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show verdict if already completed or just calculated
  if (verdictResult) {
    return (
      <VerdictScreen
        verdict={verdictResult.verdict}
        xpDelta={verdictResult.xpDelta}
        innerCoreDelta={verdictResult.innerCoreDelta}
        abyssIndexDelta={verdictResult.abyssIndexDelta}
        mentorMessage={verdictResult.mentorMessage}
        debtCreated={verdictResult.debtCreated}
        debtType={verdictResult.debtType}
        recoveryQuest={verdictResult.recoveryQuest}
        stabilizationTriggered={verdictResult.stabilizationTriggered}
        profile={verdictResult.updatedProfile}
        taskOutcomes={taskOutcomes}
        sessionSnapshot={verdictResult.verdictSessionSnapshot}
        sessionDateLabel={sessionDateLabel}
        mainResult={dayPlan.mainResult}
        weeklyTrajectory={dayPlan.weeklyTrajectory}
        tomorrowAdjustment={verdictResult.tomorrowAdjustment}
      />
    );
  }

  return (
    <ActionCourt
      dayPlan={dayPlan}
      tasks={tasks}
      profile={profile}
      onVerdictCalculated={handleVerdictCalculated}
    />
  );
}


