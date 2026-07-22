import { describe, expect, it } from 'vitest';
import { buildWeeklyGrowthSnapshot, getWeekStart } from '@/lib/weeklyGrowth';
import type { ActionCourtReview, DayPlan, FocusBlock, Goal, Task } from '@/types';

const goal: Goal = {
  id: 'goal-week',
  userId: 'user-1',
  title: 'Launch the offer',
  originalInput: 'Launch the offer',
  area: 'business',
  level: 2,
  specific: 'Publish the offer',
  measurable: 'One published offer',
  deadline: '2026-07-26',
  why: 'Test demand',
  externalResult: 'Published offer and replies',
  realismScore: 80,
  status: 'active',
  createdAt: '2026-07-20T09:00:00.000Z',
  horizon: 'weekly',
};

const tasks: Task[] = [
  {
    id: 'task-output',
    goalId: goal.id,
    title: 'Publish offer',
    type: 'output',
    importance: 'boss',
    status: 'completed',
    xpReward: 10,
    xpPenalty: 5,
    proofRequired: true,
    proof: {
      id: 'proof-1',
      taskId: 'task-output',
      type: 'link',
      value: 'https://example.com/offer',
      createdAt: '2026-07-21T11:00:00.000Z',
    },
    plannedMinutes: 45,
    createdAt: '2026-07-21T08:00:00.000Z',
    completedAt: '2026-07-21T11:00:00.000Z',
  },
  {
    id: 'task-money',
    goalId: goal.id,
    title: 'Send offer',
    type: 'monetization',
    importance: 'important',
    status: 'completed',
    xpReward: 10,
    xpPenalty: 5,
    proofRequired: false,
    plannedMinutes: 30,
    createdAt: '2026-07-22T08:00:00.000Z',
    completedAt: '2026-07-22T11:00:00.000Z',
  },
];

const dayPlans: DayPlan[] = [
  {
    id: 'day-1',
    date: '2026-07-21',
    goalId: goal.id,
    mainResult: 'Publish the offer',
    minimumAction: 'Write the headline',
    deadline: '18:00',
    risk: 'Avoidance',
    protection: 'Block notifications',
    rewardText: 'Walk',
    consequenceText: 'Review the miss',
    taskIds: tasks.map((task) => task.id),
    status: 'closed',
  },
];

const focusBlocks: FocusBlock[] = [
  {
    id: 'focus-1',
    taskId: 'task-output',
    goal: 'Publish the offer',
    durationMinutes: 40,
    startedAt: '2026-07-21T09:00:00.000Z',
    endedAt: '2026-07-21T09:40:00.000Z',
    distractions: ['phone', 'thoughts', 'phone'],
    status: 'completed',
    result: 'Offer published',
  },
];

const reviews: ActionCourtReview[] = [
  {
    id: 'review-1',
    date: '2026-07-21',
    dayPlanId: 'day-1',
    completedTaskIds: ['task-output', 'task-money'],
    failedTaskIds: [],
    partialTaskIds: [],
    falseRestDetected: false,
    verdict: 'self_victory',
    xpDelta: 10,
    innerCoreDelta: 1,
    abyssIndexDelta: -1,
    debtIds: [],
    createdAt: '2026-07-21T20:00:00.000Z',
  },
];

describe('weekly growth summary', () => {
  it('uses Monday as the start of the local week', () => {
    expect(getWeekStart(new Date(2026, 6, 21, 12))).toBe('2026-07-20');
    expect(getWeekStart(new Date(2026, 6, 26, 12))).toBe('2026-07-20');
  });

  it('aggregates plans and completed facts for one goal and week', () => {
    const snapshot = buildWeeklyGrowthSnapshot({
      goalId: goal.id,
      weekStart: '2026-07-20',
      dayPlans,
      tasks,
      focusBlocks,
      reviews,
    });

    expect(snapshot).toMatchObject({
      plannedMinutes: 75,
      focusedMinutes: 40,
      externalResults: 1,
      commercialActions: 1,
      reviewedDays: 1,
      dominantDistraction: 'phone',
      evidenceStatus: 'fact',
    });
  });

  it('reports in progress when activity exists without an external fact', () => {
    const snapshot = buildWeeklyGrowthSnapshot({
      goalId: goal.id,
      weekStart: '2026-07-20',
      dayPlans,
      tasks: tasks.map((task) => ({ ...task, status: 'in_progress', proof: undefined, completedAt: undefined })),
      focusBlocks: [],
      reviews: [],
    });

    expect(snapshot.evidenceStatus).toBe('in_progress');
    expect(snapshot.externalResults).toBe(0);
    expect(snapshot.commercialActions).toBe(0);
  });

  it('ignores data outside the selected week', () => {
    const snapshot = buildWeeklyGrowthSnapshot({
      goalId: goal.id,
      weekStart: '2026-07-27',
      dayPlans,
      tasks,
      focusBlocks,
      reviews,
    });

    expect(snapshot.evidenceStatus).toBe('hypothesis');
    expect(snapshot.plannedMinutes).toBe(0);
  });
});
