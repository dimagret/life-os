import { describe, expect, it } from 'vitest';
import type { Task } from '@/types';
import {
  buildRepairAction,
  getDayBlockTaskLimitStatus,
  groupTasksByDayBlock,
  resolveTaskDayBlock,
  sortTasksByDailyProtocol,
} from '@/lib/dailyProtocol';

function task(id: string, type: Task['type'], patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    type,
    importance: 'normal',
    status: 'planned',
    xpReward: 1,
    xpPenalty: 1,
    proofRequired: false,
    createdAt: '2026-07-05T00:00:00.000Z',
    ...patch,
  };
}

describe('dailyProtocol', () => {
  it('maps legacy learning, practice and output tasks into day blocks', () => {
    expect(resolveTaskDayBlock(task('learn', 'learning'))).toBe('morning');
    expect(resolveTaskDayBlock(task('practice', 'practice'))).toBe('day');
    expect(resolveTaskDayBlock(task('output', 'output'))).toBe('evening');
  });

  it('groups and sorts explicit protocol tasks by block and role', () => {
    const tasks = [
      task('evening-main', 'output', { dayBlock: 'evening', blockRole: 'main' }),
      task('morning-support', 'learning', { dayBlock: 'morning', blockRole: 'support' }),
      task('morning-main', 'practice', { dayBlock: 'morning', blockRole: 'main' }),
    ];

    const sorted = sortTasksByDailyProtocol(tasks);
    expect(sorted.map((item) => item.id)).toEqual(['morning-main', 'morning-support', 'evening-main']);

    const grouped = groupTasksByDayBlock(sorted);
    expect(grouped.morning.map((item) => item.id)).toEqual(['morning-main', 'morning-support']);
    expect(grouped.day).toEqual([]);
    expect(grouped.evening.map((item) => item.id)).toEqual(['evening-main']);
  });

  it('builds the tomorrow correction in the selected locale', () => {
    expect(buildRepairAction('bad_planning', 'Черновик', 'ru')).toContain('Разбить «Черновик»');
    expect(buildRepairAction('bad_planning', 'Draft', 'en')).toContain('Split “Draft”');
  });

  it('flags blocks above the one-main plus two-support rule', () => {
    const statuses = getDayBlockTaskLimitStatus([
      task('main-a', 'practice', { dayBlock: 'day', blockRole: 'main' }),
      task('main-b', 'practice', { dayBlock: 'day', blockRole: 'main' }),
      task('support-a', 'practice', { dayBlock: 'day', blockRole: 'support' }),
      task('support-b', 'practice', { dayBlock: 'day', blockRole: 'support' }),
      task('support-c', 'practice', { dayBlock: 'day', blockRole: 'support' }),
    ]);

    const day = statuses.find((status) => status.block === 'day');
    expect(day?.overMainLimit).toBe(true);
    expect(day?.overSupportLimit).toBe(true);
  });
});