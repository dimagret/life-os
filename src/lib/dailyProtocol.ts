import type { DayBlockKey, FailureReason, Task } from '@/types';

export const DAY_BLOCKS: DayBlockKey[] = ['morning', 'day', 'evening'];

export const DAY_BLOCK_INDEX: Record<DayBlockKey, number> = {
  morning: 0,
  day: 1,
  evening: 2,
};

export function getDefaultDayBlockForTaskType(type: Task['type']): DayBlockKey {
  if (type === 'learning') return 'morning';
  if (type === 'practice') return 'day';
  if (type === 'output') return 'evening';
  return 'day';
}

export function getDefaultPlannedMinutes(type: Task['type'], fallback = 25): number {
  if (type === 'learning') return 15;
  if (type === 'rest' || type === 'recovery') return 10;
  if (type === 'practice' || type === 'output') return fallback;
  return fallback;
}

export function resolveTaskDayBlock(task: Task, index = 0): DayBlockKey {
  return task.dayBlock ?? getDefaultDayBlockForTaskType(task.type) ?? DAY_BLOCKS[index % DAY_BLOCKS.length];
}

export function resolveTaskBlockRole(task: Task): 'main' | 'support' {
  return task.blockRole ?? 'main';
}

export function groupTasksByDayBlock(tasks: Task[]): Record<DayBlockKey, Task[]> {
  const grouped: Record<DayBlockKey, Task[]> = {
    morning: [],
    day: [],
    evening: [],
  };

  tasks.forEach((task, index) => {
    grouped[resolveTaskDayBlock(task, index)].push(task);
  });

  return grouped;
}

export function sortTasksByDailyProtocol(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const blockDelta = DAY_BLOCK_INDEX[resolveTaskDayBlock(a)] - DAY_BLOCK_INDEX[resolveTaskDayBlock(b)];
    if (blockDelta !== 0) return blockDelta;
    if (resolveTaskBlockRole(a) !== resolveTaskBlockRole(b)) {
      return resolveTaskBlockRole(a) === 'main' ? -1 : 1;
    }
    return 0;
  });
}

export function getDayBlockTaskLimitStatus(tasks: Task[]) {
  const grouped = groupTasksByDayBlock(tasks);

  return DAY_BLOCKS.map((block) => {
    const blockTasks = grouped[block];
    const mainCount = blockTasks.filter((task) => resolveTaskBlockRole(task) === 'main').length;
    const supportCount = blockTasks.length - mainCount;

    return {
      block,
      total: blockTasks.length,
      mainCount,
      supportCount,
      overMainLimit: mainCount > 1,
      overSupportLimit: supportCount > 2,
    };
  });
}

export function buildRepairAction(
  reason: FailureReason['type'],
  taskTitle: string,
  locale: 'ru' | 'en' = 'ru'
): string {
  const fallbackTitle = locale === 'en' ? 'task' : 'задача';
  const title = taskTitle.trim() || fallbackTitle;

  if (locale === 'en') {
    if (reason === 'task_too_big' || reason === 'bad_planning') {
      return `Split “${title}” into one 10-minute action before noon tomorrow.`;
    }
    if (reason === 'social_media' || reason === 'games' || reason === 'false_rest') {
      return `Do the first 10 minutes of “${title}” before opening feeds or games tomorrow.`;
    }
    if (reason === 'fear' || reason === 'perfectionism') {
      return `Create an imperfect 10-minute draft for “${title}” tomorrow.`;
    }
    if (reason === 'tired' || reason === 'minor_illness') {
      return `Reduce “${title}” to a 10-minute minimum and start after recovery.`;
    }
    return `Define one 10-minute minimum action for “${title}” tomorrow.`;
  }

  if (reason === 'task_too_big' || reason === 'bad_planning') {
    return `Разбить «${title}» на одно действие до 10 минут и начать его завтра до полудня.`;
  }
  if (reason === 'social_media' || reason === 'games' || reason === 'false_rest') {
    return `Сделать первые 10 минут задачи «${title}» до открытия лент или игр.`;
  }
  if (reason === 'fear' || reason === 'perfectionism') {
    return `Сделать завтра несовершенный 10-минутный черновик для задачи «${title}».`;
  }
  if (reason === 'tired' || reason === 'minor_illness') {
    return `Сократить «${title}» до 10-минутного минимума и начать после восстановления.`;
  }
  return `Определить одно минимальное действие до 10 минут для задачи «${title}» на завтра.`;
}
