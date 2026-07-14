import { describe, it, expect } from 'vitest';
import { buildMentorDayBrief } from '@/lib/mentorBrief';
import type { DayPlan, Task } from '@/types';

function dayPlan(over: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 'd1',
    date: '2026-05-06',
    mainResult: 'Ship one page',
    minimumAction: 'Open editor',
    deadline: '18:00',
    risk: 'r',
    protection: 'p',
    rewardText: 'rw',
    consequenceText: 'c',
    taskIds: [],
    status: 'active',
    ...over,
  };
}

function task(partial: Partial<Task>): Task {
  return {
    id: 't1',
    title: 'Learn (today)',
    type: 'learning',
    importance: 'normal',
    status: 'planned',
    xpReward: 1,
    xpPenalty: 1,
    proofRequired: false,
    createdAt: 'x',
    ...partial,
  };
}

describe('buildMentorDayBrief', () => {
  it('returns undefined without day plan', () => {
    expect(buildMentorDayBrief(null, [])).toBeUndefined();
    expect(buildMentorDayBrief(undefined, [])).toBeUndefined();
  });

  it('includes main result and strips legacy title suffix', () => {
    const brief = buildMentorDayBrief(dayPlan({ mainResult: 'M' }), [
      task({ title: 'T (сегодня)', microGoal: 'mg', status: 'in_progress' }),
    ]);
    expect(brief).toContain('Микроцель дня: M');
    expect(brief).toContain('· T — в процессе');
    expect(brief).toContain('фокус: mg');
    expect(brief).not.toContain('(сегодня)');
  });
});
