import type {
  ActionCourtReview,
  CourtContext,
  DayPlan,
  FailureReason,
  Task,
  UserProfile,
} from '@/types';
import { getBaseLevel } from '@/lib/mockMentor';

export type CourtTaskStatuses = Record<string, Task['status']>;

export type CourtFailureInput = {
  taskId: string;
  reasonType: FailureReason['type'];
  couldDoMinimum: boolean;
  comment?: string;
};

export type CourtTaskSummary = {
  completedTaskIds: string[];
  failedTaskIds: string[];
  partialTaskIds: string[];
  missingProofTaskIds: string[];
  mainTask?: Task;
  bossTask?: Task;
  mainTaskCompleted: boolean;
  bossTaskCompleted: boolean;
  mainTaskProofOk: boolean;
  bossTaskProofOk: boolean;
  requiredProofOk: boolean;
  externalResultCreated: boolean;
  learningWithoutPractice: boolean;
};

function statusFor(task: Task, taskStatuses: CourtTaskStatuses): Task['status'] {
  return taskStatuses[task.id] ?? task.status;
}

export function hasRequiredProof(task: Task): boolean {
  return !task.proofRequired || !!task.proof;
}

export function canCompleteTaskForCourt(task: Task): boolean {
  return hasRequiredProof(task);
}

function normalizeCourtStatus(task: Task, taskStatuses: CourtTaskStatuses): Task['status'] {
  const status = statusFor(task, taskStatuses);
  if (status === 'completed' && !hasRequiredProof(task)) {
    return 'partial';
  }
  return status;
}

export function summarizeCourtTasks(
  dayPlan: DayPlan,
  tasks: Task[],
  taskStatuses: CourtTaskStatuses
): CourtTaskSummary {
  const completedTaskIds: string[] = [];
  const failedTaskIds: string[] = [];
  const partialTaskIds: string[] = [];
  const missingProofTaskIds: string[] = [];

  for (const task of tasks) {
    const rawStatus = statusFor(task, taskStatuses);
    const normalized = normalizeCourtStatus(task, taskStatuses);

    if (rawStatus === 'completed' && !hasRequiredProof(task)) {
      missingProofTaskIds.push(task.id);
    }

    if (normalized === 'completed') {
      completedTaskIds.push(task.id);
    } else if (normalized === 'partial') {
      partialTaskIds.push(task.id);
    } else if (normalized === 'failed' || normalized === 'planned' || normalized === 'in_progress') {
      failedTaskIds.push(task.id);
    }
  }

  const bossTask = dayPlan.bossTaskId
    ? tasks.find((task) => task.id === dayPlan.bossTaskId)
    : tasks.find((task) => task.importance === 'boss' || task.type === 'output');
  const mainTask = tasks.find((task) => task.importance === 'important') ?? bossTask;
  const bossTaskCompleted = !!bossTask && completedTaskIds.includes(bossTask.id);
  const mainTaskCompleted = !!mainTask && completedTaskIds.includes(mainTask.id);
  const bossTaskProofOk = !!bossTask && hasRequiredProof(bossTask);
  const mainTaskProofOk = !!mainTask && hasRequiredProof(mainTask);
  const requiredProofOk =
    missingProofTaskIds.length === 0 &&
    tasks
      .filter((task) => completedTaskIds.includes(task.id) && task.proofRequired)
      .every((task) => !!task.proof);

  return {
    completedTaskIds,
    failedTaskIds,
    partialTaskIds,
    missingProofTaskIds,
    mainTask,
    bossTask,
    mainTaskCompleted,
    bossTaskCompleted,
    mainTaskProofOk,
    bossTaskProofOk,
    requiredProofOk,
    externalResultCreated: bossTaskCompleted && bossTaskProofOk,
    learningWithoutPractice:
      completedTaskIds.some((id) => tasks.find((task) => task.id === id)?.type === 'learning') &&
      !completedTaskIds.some((id) => tasks.find((task) => task.id === id)?.type === 'practice'),
  };
}

export function detectRepeatedFailurePattern(
  failures: CourtFailureInput[],
  previousReviews: ActionCourtReview[] = []
): boolean {
  const currentReasonTypes = new Set(failures.map((failure) => failure.reasonType));
  if (currentReasonTypes.size === 0) return false;

  let matchingPriorFailures = 0;
  for (const review of previousReviews.slice(-14)) {
    const details = review.failuresDetail ?? [];
    if (details.some((failure) => currentReasonTypes.has(failure.reasonType))) {
      matchingPriorFailures += 1;
    }
  }

  return matchingPriorFailures >= 2;
}

export function buildCourtContext({
  dayPlan,
  tasks,
  taskStatuses,
  profile,
  failures = [],
  falseRest = false,
  previousReviews = [],
  courtCompleted = true,
  skippedCourt = false,
}: {
  dayPlan: DayPlan;
  tasks: Task[];
  taskStatuses: CourtTaskStatuses;
  profile: UserProfile;
  failures?: CourtFailureInput[];
  falseRest?: boolean;
  previousReviews?: ActionCourtReview[];
  courtCompleted?: boolean;
  skippedCourt?: boolean;
}): CourtContext {
  const taskSummary = summarizeCourtTasks(dayPlan, tasks, taskStatuses);
  const repeatedPattern = detectRepeatedFailurePattern(failures, previousReviews);
  const hasSelfDeception = failures.some((failure) => {
    const baseLevel = getBaseLevel(failure.reasonType);
    return failure.couldDoMinimum && baseLevel >= 1;
  });
  const hasRespectfulReason = failures.some((failure) => {
    const baseLevel = getBaseLevel(failure.reasonType);
    return baseLevel === 0 && !failure.couldDoMinimum;
  });

  return {
    strictnessMode: profile.strictnessMode,
    mainTaskCompleted: taskSummary.mainTaskCompleted,
    bossTaskCompleted: taskSummary.bossTaskCompleted,
    mainTaskProofOk: taskSummary.mainTaskProofOk,
    bossTaskProofOk: taskSummary.bossTaskProofOk,
    requiredProofOk: taskSummary.requiredProofOk,
    missingRequiredProof: taskSummary.missingProofTaskIds.length > 0,
    proofOk:
      taskSummary.completedTaskIds.length > 0 &&
      taskSummary.requiredProofOk &&
      taskSummary.mainTaskProofOk &&
      taskSummary.bossTaskProofOk,
    courtCompleted,
    respectfulReason: hasRespectfulReason,
    partialCompletion:
      taskSummary.partialTaskIds.length > 0 || taskSummary.missingProofTaskIds.length > 0,
    selfDeceptionDetected: hasSelfDeception || repeatedPattern,
    recoveryQuestCompletedAfterFailure: false,
    couldDoMinimum: failures.some((failure) => failure.couldDoMinimum),
    falseRestDetected: falseRest,
    repeatedPattern,
    failedMainTask: taskSummary.mainTask
      ? taskSummary.failedTaskIds.includes(taskSummary.mainTask.id)
      : false,
    failedBossTask: taskSummary.bossTask
      ? taskSummary.failedTaskIds.includes(taskSummary.bossTask.id)
      : false,
    skippedCourt,
    externalResultCreated: taskSummary.externalResultCreated,
    learningWithoutPractice: taskSummary.learningWithoutPractice,
  };
}
