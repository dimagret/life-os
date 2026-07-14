import { describe, expect, it } from 'vitest';
import { buildCourtContext, detectRepeatedFailurePattern, summarizeCourtTasks } from '@/lib/courtRules';
import { determineVerdict } from '@/lib/mockMentor';
import type { ActionCourtReview, DayPlan, Task, UserProfile } from '@/types';

const profile = {
  strictnessMode: 'standard',
} as UserProfile;

const baseTask = {
  goalId: 'goal-1',
  description: '',
  status: 'planned',
  dueAt: undefined,
  xpReward: 10,
  xpPenalty: 10,
  proof: undefined,
  createdAt: '2026-05-28T00:00:00.000Z',
} satisfies Partial<Task>;

const practiceTask: Task = {
  ...baseTask,
  id: 'task-practice',
  title: 'Practice',
  type: 'practice',
  importance: 'important',
  proofRequired: true,
} as Task;

const outputTask: Task = {
  ...baseTask,
  id: 'task-output',
  title: 'Output',
  type: 'output',
  importance: 'boss',
  proofRequired: true,
} as Task;

const plan: DayPlan = {
  id: 'day-1',
  date: '2026-05-28',
  goalId: 'goal-1',
  mainResult: 'Visible result',
  bossTaskId: outputTask.id,
  minimumAction: '5 minutes',
  deadline: '23:59',
  risk: '',
  protection: '',
  rewardText: '',
  consequenceText: '',
  taskIds: [practiceTask.id, outputTask.id],
  status: 'active',
};

function withProof(task: Task): Task {
  return {
    ...task,
    proof: {
      id: `proof-${task.id}`,
      taskId: task.id,
      type: 'text',
      value: 'done',
      createdAt: '2026-05-28T10:00:00.000Z',
    },
  };
}

describe('court rules', () => {
  it('downgrades completed proof-required tasks without proof before court', () => {
    const summary = summarizeCourtTasks(plan, [practiceTask, outputTask], {
      [practiceTask.id]: 'completed',
      [outputTask.id]: 'completed',
    });

    expect(summary.completedTaskIds).toEqual([]);
    expect(summary.partialTaskIds).toEqual([practiceTask.id, outputTask.id]);
    expect(summary.missingProofTaskIds).toEqual([practiceTask.id, outputTask.id]);
    expect(summary.requiredProofOk).toBe(false);
  });

  it('allows self victory only when main and boss tasks have accepted proof', () => {
    const tasks = [withProof(practiceTask), withProof(outputTask)];
    const context = buildCourtContext({
      dayPlan: plan,
      tasks,
      taskStatuses: {
        [practiceTask.id]: 'completed',
        [outputTask.id]: 'completed',
      },
      profile,
    });

    expect(context.proofOk).toBe(true);
    expect(context.mainTaskCompleted).toBe(true);
    expect(context.bossTaskCompleted).toBe(true);
    expect(context.externalResultCreated).toBe(true);
    expect(determineVerdict(context)).toBe('self_victory');
  });

  it('does not grant self victory when boss proof is missing', () => {
    const tasks = [withProof(practiceTask), outputTask];
    const context = buildCourtContext({
      dayPlan: plan,
      tasks,
      taskStatuses: {
        [practiceTask.id]: 'completed',
        [outputTask.id]: 'completed',
      },
      profile,
    });

    expect(context.proofOk).toBe(false);
    expect(context.bossTaskCompleted).toBe(false);
    expect(context.missingRequiredProof).toBe(true);
    expect(determineVerdict(context)).toBe('partial_victory');
  });

  it('detects repeated failure reasons from recent court history', () => {
    const previousReviews = [
      { failuresDetail: [{ taskId: 'a', reasonType: 'learning_instead_action', couldDoMinimum: true, comment: '' }] },
      { failuresDetail: [{ taskId: 'b', reasonType: 'learning_instead_action', couldDoMinimum: true, comment: '' }] },
    ] as ActionCourtReview[];

    expect(
      detectRepeatedFailurePattern(
        [{ taskId: 'c', reasonType: 'learning_instead_action', couldDoMinimum: true, comment: '' }],
        previousReviews
      )
    ).toBe(true);
  });
});
