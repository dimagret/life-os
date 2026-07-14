'use client';

import type { DayPlan, Goal, Task, UserProfile } from '@/types';
import {
  createDayPlan,
  createTask,
  getTasksByIds,
  getTodayPlan,
  loadDayPlans,
} from '@/lib/storage';
import { generateDayOrder } from '@/lib/mockMentor';
import { getDefaultPlannedMinutes } from '@/lib/dailyProtocol';
import { pickLatestTomorrowAdjustmentBefore } from '@/lib/tomorrowAdjustment';
import {
  getTodayDate,
  stripLegacyTodayFromTaskTitle,
  stripTrajectoryContextPrefix,
} from '@/lib/utils';
import type { DailyTrajectoryPayload } from '@/lib/aiMentor';
import { getGoalTimeline } from '@/lib/goalCalendar';

export type DayPlanTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

export interface DayPlanBundle {
  dayPlan: DayPlan;
  tasks: Task[];
}

interface DayPlanCopyOverrides {
  minimumAction?: string;
  deadline?: string;
  proof?: string;
  risk?: string;
  protection?: string;
  rewardText?: string;
  consequenceText?: string;
}

interface CreateDayPlanFromTrajectoryInput {
  goal: Goal;
  profile: UserProfile;
  trajectory: DailyTrajectoryPayload;
  tToday: DayPlanTranslator;
  mainResult?: string;
  weeklyTrajectory?: string;
  copy?: DayPlanCopyOverrides;
}

function compactText(text: string, max = 220): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

export function taskMicroGoalFrom(title: string, description: string): string {
  const strippedDescription = stripTrajectoryContextPrefix(description);
  return compactText(strippedDescription || stripLegacyTodayFromTaskTitle(title), 220);
}

/**
 * Persists the canonical three-block day protocol from a prepared trajectory.
 * Both the regular Today flow and the fast first run use this single writer.
 */
export function createDayPlanFromTrajectory({
  goal,
  profile,
  trajectory,
  tToday,
  mainResult,
  weeklyTrajectory,
  copy,
}: CreateDayPlanFromTrajectoryInput): DayPlanBundle {
  const existingPlan = getTodayPlan();
  if (existingPlan) {
    return {
      dayPlan: existingPlan,
      tasks: getTasksByIds(existingPlan.taskIds),
    };
  }

  const today = getTodayDate();
  const goalTimeline = getGoalTimeline(goal.createdAt, goal.deadline, today);
  const previousAdjustment = pickLatestTomorrowAdjustmentBefore(loadDayPlans(), today);
  const analysisLike = {
    originalInput: goal.originalInput,
    rewrittenGoal: goal.title,
    externalResult: goal.externalResult,
    realismScore: goal.realismScore,
    warnings: [] as string[],
    suggestedDeadline: goalTimeline.deadlineDate,
    suggestedDeadlineDays: goalTimeline.totalCalendarDays,
    suggestedFirstAction: goal.specific,
    suggestedFirstActionMinutes: 30,
  };
  const dayOrder = generateDayOrder(analysisLike, profile.strictnessMode);
  const focusMinutes = Math.max(10, dayOrder.focusMinutes || 25);

  const learningTask = createTask({
    goalId: goal.id,
    title: trajectory.learningTitle,
    description: trajectory.learningDescription,
    microGoal: taskMicroGoalFrom(trajectory.learningTitle, trajectory.learningDescription),
    type: 'learning',
    importance: 'normal',
    status: 'planned',
    xpReward: 10,
    xpPenalty: 5,
    proofRequired: false,
    dayBlock: 'morning',
    blockRole: 'main',
    plannedMinutes: getDefaultPlannedMinutes('learning', focusMinutes),
  });

  const practiceTask = createTask({
    goalId: goal.id,
    title: trajectory.practiceTitle,
    description: trajectory.practiceDescription,
    microGoal: taskMicroGoalFrom(trajectory.practiceTitle, trajectory.practiceDescription),
    type: 'practice',
    importance: 'important',
    status: 'planned',
    xpReward: 20,
    xpPenalty: 20,
    proofRequired: true,
    dayBlock: 'day',
    blockRole: 'main',
    plannedMinutes: getDefaultPlannedMinutes('practice', focusMinutes),
  });

  const outputTask = createTask({
    goalId: goal.id,
    title: trajectory.outputTitle,
    description: `${trajectory.outputDescription}\n\n${copy?.proof ?? dayOrder.proof}`,
    microGoal: taskMicroGoalFrom(trajectory.outputTitle, trajectory.outputDescription),
    type: 'output',
    importance: 'boss',
    status: 'planned',
    xpReward: 40,
    xpPenalty: 40,
    proofRequired: true,
    dayBlock: 'evening',
    blockRole: 'main',
    plannedMinutes: getDefaultPlannedMinutes('output', focusMinutes),
  });

  const baseProtection = copy?.protection ?? dayOrder.protection;
  const dayPlan = createDayPlan({
    date: today,
    goalId: goal.id,
    mainResult: mainResult?.trim() || trajectory.microGoal,
    weeklyTrajectory: weeklyTrajectory?.trim() || trajectory.weeklyLink,
    bossTaskId: outputTask.id,
    minimumAction:
      copy?.minimumAction ?? (trajectory.minimumAction.trim() || dayOrder.minimumAction),
    deadline: copy?.deadline ?? dayOrder.deadline,
    risk: copy?.risk ?? (trajectory.risk.trim() || dayOrder.risk),
    protection: previousAdjustment
      ? `${baseProtection}\n${tToday('tomorrowAdjustmentPrefix', { adjustment: previousAdjustment })}`
      : baseProtection,
    rewardText: copy?.rewardText ?? dayOrder.rewardText,
    consequenceText: copy?.consequenceText ?? tToday('repairConsequence'),
    taskIds: [learningTask.id, practiceTask.id, outputTask.id],
    status: 'active',
    dailyProtocolVersion: 1,
  });

  return { dayPlan, tasks: [learningTask, practiceTask, outputTask] };
}
