import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  loadUserProfile,
  saveUserProfile,
  loadDebts,
  loadGoals,
  getActiveGoal,
  getTodayPlan,
  updateTask,
  addProofToTask,
  getTasksByIds,
  loadActionCourtReviews,
  saveActionCourtReviews,
  loadRecoveryQuests,
  saveRecoveryQuests,
  closeDebt,
  loadDayPlans,
  updateDayPlan,
} from '@/lib/storage';
import {
  UserProfile,
  DayPlan,
  Task,
  RecoveryQuest,
  ActionCourtReview,
  Goal,
} from '@/types';
import { checkStabilizationExit } from '@/lib/mockMentor';
import { calculateScoring } from '@/lib/scoring';
import { buildCourtContext, summarizeCourtTasks } from '@/lib/courtRules';
import { buildVerdictSessionSnapshot } from '@/lib/verdictSession';
import { generateDailyTrajectoryAsync, type DailyTrajectoryPayload } from '@/lib/aiMentor';
import {
  formatLocalDate,
  generateId,
  getTodayDate,
  stripLegacyTodayFromTaskTitle,
} from '@/lib/utils';
import { getNextPathDayOrdinal, getPathDayOrdinal, isDayPlanReadyForCourt } from '@/lib/dayPlan';
import { createDayPlanFromTrajectory, taskMicroGoalFrom } from '@/lib/dayPlanCreation';

const XP_PER_LEVEL_SEGMENT = 200;
type TodayTranslator = (key: string, values?: Record<string, string | number>) => string;

function goalSearchText(goal: Goal): string {
  return `${goal.title} ${goal.originalInput} ${goal.externalResult} ${goal.specific} ${goal.measurable}`.toLowerCase();
}

function isClientAcquisitionGoal(goal: Goal): boolean {
  const text = goalSearchText(goal);
  const hasMoneyOrClients =
    /заработ|доллар|\$|клиент|заказ|фриланс|продаж|доход|коммерческ|оффер|client|customer|earn|money|order|proposal|offer|freelance/i.test(text);
  const hasWebWork = /сайт|лендинг|веб|website|landing|web\s?site|web app|site/i.test(text);
  return hasMoneyOrClients && (hasWebWork || goal.area === 'money' || goal.area === 'business');
}

function removeDonePrefix(text: string): string {
  return text
    .replace(/^(\s*(?:Недельный ориентир|Цель недели):\s*)?Сделано:\s*/iu, (_match, prefix = '') => prefix)
    .replace(/^(\s*(?:Week anchor|Weekly goal):\s*)?Done:\s*/iu, (_match, prefix = '') => prefix)
    .trim();
}

function hasDonePrefix(text: string): boolean {
  return /\bСделано:\s*/iu.test(text) || /\bDone:\s*/iu.test(text);
}

function repeatsWeeklyGoal(text: string, goal: Goal): boolean {
  const normalized = text.toLowerCase();
  const title = goal.title.toLowerCase().trim();
  return (
    /^день\s+\d+\s+к\s+«/iu.test(text) ||
    /^day\s+\d+\s+toward\s+[“"]/iu.test(text) ||
    (title.length > 28 && normalized.includes(title))
  );
}

function sanitizeTrajectoryForGoal(
  traj: DailyTrajectoryPayload,
  fallback: DailyTrajectoryPayload,
  goal: Goal
): DailyTrajectoryPayload {
  const microCandidate = removeDonePrefix(traj.microGoal);
  const weeklyCandidate = removeDonePrefix(traj.weeklyLink);
  return {
    ...traj,
    microGoal:
      !microCandidate || hasDonePrefix(traj.microGoal) || repeatsWeeklyGoal(microCandidate, goal)
        ? fallback.microGoal
        : microCandidate,
    weeklyLink:
      !weeklyCandidate || hasDonePrefix(traj.weeklyLink)
        ? fallback.weeklyLink
        : weeklyCandidate,
    outputTitle:
      /^(Внешний результат:\s*видимый шаг|External result:\s*visible step)$/iu.test(traj.outputTitle.trim()) &&
      isClientAcquisitionGoal(goal)
        ? fallback.outputTitle
        : traj.outputTitle,
    outputDescription:
      hasDonePrefix(traj.outputDescription) ? fallback.outputDescription : removeDonePrefix(traj.outputDescription),
  };
}

function fallbackForTaskType(traj: DailyTrajectoryPayload, type: Task['type']) {
  if (type === 'learning') {
    return { title: traj.learningTitle, description: traj.learningDescription };
  }
  if (type === 'practice') {
    return { title: traj.practiceTitle, description: traj.practiceDescription };
  }
  return { title: traj.outputTitle, description: traj.outputDescription };
}

export function shouldRepairLegacyTask(task: Task): boolean {
  const title = stripLegacyTodayFromTaskTitle(task.title).trim();
  return /^(Обучение:\s*материал под этап дня|Практика:\s*закрепить изученное|Внешний результат:\s*видимый шаг|Learning:\s*material for today(?:['’]s stage)?|Practice:\s*apply what you learned|External result:\s*visible step)$/iu.test(title);
}

function localizedLegacyTaskTitle(tToday: TodayTranslator, type: Task['type']): string {
  if (type === 'learning') {
    return tToday('dailyTrajectoryFallback.learningTitle');
  }
  if (type === 'practice') {
    return tToday('dailyTrajectoryFallback.practiceTitle');
  }
  return tToday('dailyTrajectoryFallback.outputTitle');
}

function buildFallbackTrajectory(
  tToday: TodayTranslator,
  goal: Goal,
  dayOrdinal: number
): DailyTrajectoryPayload {
  if (isClientAcquisitionGoal(goal)) {
    return {
      microGoal: tToday('dailyTrajectoryFallback.clientMicroGoal'),
      weeklyLink: tToday('dailyTrajectoryFallback.clientWeeklyLink', {
        horizon: goal.externalResult,
      }),
      learningTitle: tToday('dailyTrajectoryFallback.clientLearningTitle'),
      learningDescription: tToday('dailyTrajectoryFallback.clientLearningDesc', {
        track: goal.title,
      }),
      practiceTitle: tToday('dailyTrajectoryFallback.clientPracticeTitle'),
      practiceDescription: tToday('dailyTrajectoryFallback.clientPracticeDesc'),
      outputTitle: tToday('dailyTrajectoryFallback.clientOutputTitle'),
      outputDescription: tToday('dailyTrajectoryFallback.clientOutputDesc', {
        horizon: goal.externalResult,
      }),
      risk: tToday('dailyTrajectoryFallback.clientRisk'),
      minimumAction: tToday('dailyTrajectoryFallback.clientMinimumAction'),
    };
  }

  return {
    microGoal: tToday('dailyTrajectoryFallback.microGoal', {
      day: dayOrdinal,
      track: goal.title,
    }),
    weeklyLink: tToday('dailyTrajectoryFallback.weeklyLink', {
      horizon: goal.externalResult,
      track: goal.title,
    }),
    learningTitle: tToday('dailyTrajectoryFallback.learningTitle'),
    learningDescription: tToday('dailyTrajectoryFallback.learningDesc', {
      track: goal.title,
      day: dayOrdinal,
    }),
    practiceTitle: tToday('dailyTrajectoryFallback.practiceTitle'),
    practiceDescription: tToday('dailyTrajectoryFallback.practiceDesc', { track: goal.title }),
    outputTitle: tToday('dailyTrajectoryFallback.outputTitle'),
    outputDescription: tToday('dailyTrajectoryFallback.outputDesc', {
      horizon: goal.externalResult,
      track: goal.title,
    }),
    risk: '',
    minimumAction: '',
  };
}

export function useTodayData() {
  const tToday = useTranslations('today');
  const rawLocale = useLocale();
  const trajectoryLocale = rawLocale === 'en' ? 'en' : 'ru';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [debtsCount, setDebtsCount] = useState(0);
  const [hasGoals, setHasGoals] = useState(false);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courtCompleted, setCourtCompleted] = useState(false);
  const [recoveryQuests, setRecoveryQuests] = useState<RecoveryQuest[]>([]);
  const [yesterdayReview, setYesterdayReview] = useState<ActionCourtReview | null>(null);
  const [creatingDayPlan, setCreatingDayPlan] = useState(false);

  const loadData = useCallback(() => {
    const userProfile = loadUserProfile();
    setProfile(userProfile);

    if (!userProfile.onboardingCompleted) {
      return false;
    }

    const debts = loadDebts();
    setDebtsCount(debts.filter((d) => d.status === 'open').length);

    const quests = loadRecoveryQuests();
    setRecoveryQuests(quests);

    const goals = loadGoals();
    setHasGoals(goals.length > 0);

    const todayPlan = getTodayPlan();
    if (todayPlan) {
      const activeGoal =
        goals.find((g) => g.id === todayPlan.goalId) ?? getActiveGoal();
      const todayTasksRaw = getTasksByIds(todayPlan.taskIds);
      let planForState = todayPlan;
      let tasksForState = todayTasksRaw;

      if (!activeGoal) {
        let repairedLegacyTitle = false;
        tasksForState = todayTasksRaw.map((task) => {
          if (!shouldRepairLegacyTask(task)) return task;
          repairedLegacyTitle = true;
          const title = localizedLegacyTaskTitle(tToday, task.type);
          return updateTask(task.id, { title }) ?? { ...task, title };
        });
        if (repairedLegacyTitle) {
          tasksForState = getTasksByIds(todayPlan.taskIds);
        }
      }

      if (activeGoal) {
        const dayOrdinal = getPathDayOrdinal(todayPlan.date, loadDayPlans()) ?? 1;
        const fallback = buildFallbackTrajectory(tToday, activeGoal, dayOrdinal);
        const planPatch: Partial<DayPlan> = {};

        if (
          !todayPlan.mainResult.trim() ||
          hasDonePrefix(todayPlan.mainResult) ||
          repeatsWeeklyGoal(todayPlan.mainResult, activeGoal)
        ) {
          planPatch.mainResult = fallback.microGoal;
        }

        if (!todayPlan.weeklyTrajectory?.trim() || hasDonePrefix(todayPlan.weeklyTrajectory)) {
          planPatch.weeklyTrajectory = fallback.weeklyLink;
        }

        if (Object.keys(planPatch).length > 0) {
          planForState = updateDayPlan(todayPlan.id, planPatch) ?? todayPlan;
        }

        let patchedAnyTask = false;
        tasksForState = todayTasksRaw.map((task) => {
          const fallbackTask = fallbackForTaskType(fallback, task.type);
          const patch: Partial<Task> = {};

          if (shouldRepairLegacyTask(task)) {
            patch.title = fallbackTask.title;
            patch.description = fallbackTask.description;
          }

          if (
            !task.microGoal?.trim() ||
            hasDonePrefix(task.microGoal) ||
            repeatsWeeklyGoal(task.microGoal, activeGoal)
          ) {
            const title = patch.title ?? task.title;
            const description = patch.description ?? task.description ?? '';
            patch.microGoal = taskMicroGoalFrom(title, description);
          }

          if (Object.keys(patch).length === 0) return task;
          patchedAnyTask = true;
          return updateTask(task.id, patch) ?? { ...task, ...patch };
        });

        if (patchedAnyTask) {
          tasksForState = getTasksByIds(planForState.taskIds);
        }
      }

      const reviews = loadActionCourtReviews();
      const todayReview = reviews.find((r) => r.dayPlanId === planForState.id);
      if (todayReview) {
        if (planForState.status !== 'closed') {
          planForState = updateDayPlan(planForState.id, { status: 'closed' }) ?? planForState;
        }

        const statusByTaskId = new Map<Task['id'], Task['status']>();
        todayReview.completedTaskIds.forEach((id) => statusByTaskId.set(id, 'completed'));
        todayReview.partialTaskIds.forEach((id) => statusByTaskId.set(id, 'partial'));
        todayReview.failedTaskIds.forEach((id) => statusByTaskId.set(id, 'failed'));

        let patchedCourtStatuses = false;
        tasksForState = tasksForState.map((task) => {
          const status = statusByTaskId.get(task.id);
          if (!status || task.status === status) return task;
          patchedCourtStatuses = true;
          return updateTask(task.id, { status }) ?? { ...task, status };
        });

        if (patchedCourtStatuses) {
          tasksForState = getTasksByIds(planForState.taskIds);
        }
      }

      setDayPlan(planForState);
      setTasks(tasksForState);
      setCourtCompleted(!!todayReview);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatLocalDate(yesterday);
      const yReview = reviews.find((r) => r.date === yesterdayStr);
      setYesterdayReview(yReview || null);
    } else {
      setDayPlan(null);
      setTasks([]);
      setCourtCompleted(false);
    }

    return true;
  }, [tToday]);

  const handleCreateDayPlan = useCallback(async () => {
    const activeGoal = getActiveGoal();
    const userProfile = loadUserProfile();

    if (!activeGoal || !userProfile) return;

    const existingPlan = getTodayPlan();
    if (existingPlan) {
      setDayPlan(existingPlan);
      setTasks(getTasksByIds(existingPlan.taskIds));
      return;
    }

    setCreatingDayPlan(true);
    try {
      const today = getTodayDate();
      const plans = loadDayPlans();
      const dayOrdinal = getNextPathDayOrdinal(today, plans);

      const aiBundle =
        (await generateDailyTrajectoryAsync({
          weeklyGoalTitle: activeGoal.title,
          weeklyOriginalInput: activeGoal.originalInput,
          externalResult: activeGoal.externalResult,
          deadline: activeGoal.deadline,
          dayOrdinal,
          locale: trajectoryLocale,
        })) ?? null;

      const fallbackTrajectory = buildFallbackTrajectory(tToday, activeGoal, dayOrdinal);
      const traj = sanitizeTrajectoryForGoal(
        aiBundle ?? fallbackTrajectory,
        fallbackTrajectory,
        activeGoal
      );
      const bundle = createDayPlanFromTrajectory({
        goal: activeGoal,
        profile: userProfile,
        trajectory: traj,
        tToday,
      });

      setDayPlan(bundle.dayPlan);
      setTasks(bundle.tasks);
    } finally {
      setCreatingDayPlan(false);
    }
  }, [tToday, trajectoryLocale]);

  const handleSaveDayMicroGoal = useCallback((mainResult: string) => {
    setDayPlan((prev) => {
      if (!prev) return prev;
      const next = updateDayPlan(prev.id, { mainResult });
      return next ?? prev;
    });
  }, []);

  const handleUpdateTask = (taskId: string, patch: Partial<Task>) => {
    const updated = updateTask(taskId, patch);
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  };

  const handleAddProof = (taskId: string, type: 'text' | 'link', value: string) => {
    const updated = addProofToTask(taskId, { type, value });
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  };

  const handleCloseDayWithoutCourt = () => {
    if (!profile || !dayPlan) return;
    if (profile.strictnessMode !== 'soft') return;
    if (!isDayPlanReadyForCourt(tasks)) return;

    const taskStatuses = Object.fromEntries(
      tasks.map((task) => [task.id, task.status])
    ) as Record<string, Task['status']>;
    const taskSummary = summarizeCourtTasks(dayPlan, tasks, taskStatuses);
    if (taskSummary.failedTaskIds.length > 0) return;

    const context = buildCourtContext({
      dayPlan,
      tasks,
      taskStatuses,
      profile,
      courtCompleted: false,
      skippedCourt: true,
    });
    const scoring = calculateScoring(context);
    const verdict =
      taskSummary.completedTaskIds.length > 0 || taskSummary.partialTaskIds.length > 0
        ? 'partial_victory'
        : 'failure';
    const nextProfile: UserProfile = {
      ...profile,
      totalXp: Math.max(0, profile.totalXp + scoring.xpDelta),
      innerCore: Math.max(0, Math.min(100, profile.innerCore + scoring.innerCoreDelta)),
      abyssIndex: Math.max(0, Math.min(100, profile.abyssIndex + scoring.abyssIndexDelta)),
      externalResultsCount: context.externalResultCreated
        ? profile.externalResultsCount + 1
        : profile.externalResultsCount,
    };
    nextProfile.level = Math.floor(Math.max(0, nextProfile.totalXp) / XP_PER_LEVEL_SEGMENT) + 1;

    const snapshot = buildVerdictSessionSnapshot({
      verdict,
      dayPlan,
      tasks,
      taskStatuses,
      failures: [],
      focusBlocks: [],
    });

    const review: ActionCourtReview = {
      id: generateId('review'),
      date: dayPlan.date,
      dayPlanId: dayPlan.id,
      completedTaskIds: taskSummary.completedTaskIds,
      failedTaskIds: taskSummary.failedTaskIds,
      partialTaskIds: taskSummary.partialTaskIds,
      falseRestDetected: false,
      verdict,
      xpDelta: scoring.xpDelta,
      innerCoreDelta: scoring.innerCoreDelta,
      abyssIndexDelta: scoring.abyssIndexDelta,
      debtIds: [],
      createdAt: new Date().toISOString(),
      failuresDetail: [],
      verdictSessionSnapshot: snapshot,
    };

    saveUserProfile(nextProfile);
    saveActionCourtReviews([...loadActionCourtReviews(), review]);
    const closedPlan = updateDayPlan(dayPlan.id, { status: 'closed' }) ?? dayPlan;

    setProfile(nextProfile);
    setDayPlan(closedPlan);
    setCourtCompleted(true);
  };

  const handleCompleteRecoveryQuest = (questId: string) => {
    if (!profile) return;

    const quests = loadRecoveryQuests();
    const questIndex = quests.findIndex((q) => q.id === questId);
    if (questIndex === -1) return;

    const quest = quests[questIndex];
    if (quest.status !== 'planned') return;

    quests[questIndex] = { ...quest, status: 'completed' };
    saveRecoveryQuests(quests);
    setRecoveryQuests(quests);

    const newProfile = { ...profile };
    newProfile.totalXp = Math.max(0, newProfile.totalXp + quest.xpRestore);
    newProfile.innerCore = Math.max(0, Math.min(100, newProfile.innerCore + quest.innerCoreReward));
    newProfile.abyssIndex = Math.max(0, newProfile.abyssIndex - quest.abyssReduction);
    newProfile.level = Math.floor(Math.max(0, newProfile.totalXp) / XP_PER_LEVEL_SEGMENT) + 1;

    saveUserProfile(newProfile);
    setProfile(newProfile);
  };

  const handleCloseDebt = (debtId: string) => {
    if (!profile) return;

    closeDebt(debtId);

    const debts = loadDebts();
    setDebtsCount(debts.filter((d) => d.status === 'open').length);

    const newProfile = { ...profile };
    newProfile.totalXp += 5;
    newProfile.abyssIndex = Math.max(0, newProfile.abyssIndex - 2);
    newProfile.level = Math.floor(Math.max(0, newProfile.totalXp) / XP_PER_LEVEL_SEGMENT) + 1;

    saveUserProfile(newProfile);
    setProfile(newProfile);
  };

  const handleExitStabilization = () => {
    if (!profile) return;

    const debts = loadDebts();
    const quests = loadRecoveryQuests();

    if (!checkStabilizationExit(profile, debts, quests)) return;

    const newProfile = { ...profile, activeStabilization: false };
    saveUserProfile(newProfile);
    setProfile(newProfile);
  };

  return {
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
  };
}




