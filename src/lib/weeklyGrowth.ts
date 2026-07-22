import type {
  ActionCourtReview,
  DayPlan,
  FocusBlock,
  Task,
  WeeklyGrowthSnapshot,
} from '@/types';

interface WeeklyGrowthInput {
  goalId: string;
  weekStart: string;
  dayPlans: DayPlan[];
  tasks: Task[];
  focusBlocks: FocusBlock[];
  reviews: ActionCourtReview[];
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateFromTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localDate(parsed);
}

function isWithinWeek(value: string | null, weekStart: string, weekEnd: string): boolean {
  return Boolean(value && value >= weekStart && value < weekEnd);
}

export function getWeekStart(value: Date = new Date()): string {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return localDate(start);
}

export function buildWeeklyGrowthSnapshot({
  goalId,
  weekStart,
  dayPlans,
  tasks,
  focusBlocks,
  reviews,
}: WeeklyGrowthInput): WeeklyGrowthSnapshot {
  const end = parseLocalDate(weekStart);
  end.setDate(end.getDate() + 7);
  const weekEnd = localDate(end);

  const weekPlans = dayPlans.filter(
    (plan) => plan.goalId === goalId && isWithinWeek(plan.date, weekStart, weekEnd),
  );
  const planIds = new Set(weekPlans.map((plan) => plan.id));
  const plannedTaskIds = new Set(weekPlans.flatMap((plan) => plan.taskIds));
  const goalTasks = tasks.filter((task) => task.goalId === goalId);
  const goalTaskIds = new Set(goalTasks.map((task) => task.id));
  const plannedTasks = goalTasks.filter((task) => plannedTaskIds.has(task.id));
  const completedThisWeek = goalTasks.filter(
    (task) =>
      task.status === 'completed' &&
      isWithinWeek(dateFromTimestamp(task.completedAt), weekStart, weekEnd),
  );
  const completedFocus = focusBlocks.filter(
    (block) =>
      block.status === 'completed' &&
      Boolean(block.taskId && goalTaskIds.has(block.taskId)) &&
      isWithinWeek(dateFromTimestamp(block.endedAt), weekStart, weekEnd),
  );

  const distractionCounts = new Map<string, number>();
  completedFocus.flatMap((block) => block.distractions).forEach((distraction) => {
    distractionCounts.set(distraction, (distractionCounts.get(distraction) ?? 0) + 1);
  });
  const dominantDistraction = Array.from(distractionCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];

  const externalResults = completedThisWeek.filter(
    (task) => task.type === 'output' && (!task.proofRequired || Boolean(task.proof)),
  ).length;
  const commercialActions = completedThisWeek.filter(
    (task) => task.type === 'monetization',
  ).length;
  const reviewedDays = reviews.filter(
    (review) =>
      planIds.has(review.dayPlanId) && isWithinWeek(review.date, weekStart, weekEnd),
  ).length;
  const createdGoalTasks = goalTasks.filter((task) =>
    isWithinWeek(dateFromTimestamp(task.createdAt), weekStart, weekEnd),
  );
  const hasActivity = weekPlans.length > 0 || completedFocus.length > 0 || createdGoalTasks.length > 0;

  return {
    plannedMinutes: plannedTasks.reduce((total, task) => total + (task.plannedMinutes ?? 0), 0),
    focusedMinutes: completedFocus.reduce((total, block) => total + block.durationMinutes, 0),
    externalResults,
    commercialActions,
    reviewedDays,
    dominantDistraction,
    evidenceStatus:
      externalResults > 0 || commercialActions > 0
        ? 'fact'
        : hasActivity
          ? 'in_progress'
          : 'hypothesis',
  };
}
