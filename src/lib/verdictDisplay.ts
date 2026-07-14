import type { Task } from '@/types';
import type { VerdictTaskOutcome } from '@/components/court/VerdictScreen';

/** Для экрана вердикта из текущих статусов задач (перед финальным сохранением). */
export function buildVerdictTaskOutcomesFromStatuses(
  taskList: Task[],
  taskStatuses: Record<string, Task['status']>
): VerdictTaskOutcome[] {
  return taskList.map((task) => {
    const st = taskStatuses[task.id] ?? 'planned';
    let outcome: VerdictTaskOutcome['outcome'] = 'failed';
    if (st === 'completed') outcome = 'completed';
    else if (st === 'partial') outcome = 'partial';
    else outcome = 'failed';
    return { taskId: task.id, title: task.title, outcome };
  });
}

export function formatVerdictSessionDate(isoDate: string, locale: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((x) => !Number.isFinite(x))) return isoDate;
  const [y, mo, d] = parts;
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function buildVerdictTaskOutcomes(
  taskList: Task[],
  completedTaskIds: string[],
  partialTaskIds: string[],
  failedTaskIds: string[]
): VerdictTaskOutcome[] {
  const completed = new Set(completedTaskIds);
  const partial = new Set(partialTaskIds);
  const failed = new Set(failedTaskIds);
  return taskList.map((task) => {
    let outcome: VerdictTaskOutcome['outcome'] = 'failed';
    if (completed.has(task.id)) outcome = 'completed';
    else if (partial.has(task.id)) outcome = 'partial';
    else if (failed.has(task.id)) outcome = 'failed';
    return { taskId: task.id, title: task.title, outcome };
  });
}
