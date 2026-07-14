import { describe, expect, it } from 'vitest';
import { shouldRepairLegacyTask } from '@/hooks/useTodayData';
import type { Task } from '@/types';

function taskWithTitle(title: string): Task {
  return { title } as Task;
}

describe('legacy generated task locale repair', () => {
  it.each([
    'Learning: material for today',
    "Learning: material for today's stage",
    'Learning: material for today’s stage',
  ])('repairs the English learning fallback %s', (title) => {
    expect(shouldRepairLegacyTask(taskWithTitle(title))).toBe(true);
  });

  it('does not replace a user-authored English task', () => {
    expect(shouldRepairLegacyTask(taskWithTitle('Read the English research paper'))).toBe(false);
  });
});
