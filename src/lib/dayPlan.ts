import type { DayPlan, Task } from '@/types';
import { formatLocalDate } from '@/lib/utils';

/** Задача получила финальный статус дня: выполнено, частично или сорвано. */
export function isTaskFinishedForDay(task: Task): boolean {
  return task.status === 'completed' || task.status === 'partial' || task.status === 'failed';
}

export function isTaskProofReadyForCourt(task: Task): boolean {
  return task.status !== 'completed' || !task.proofRequired || !!task.proof;
}

export function countFinishedDayTasks(tasks: Task[]): number {
  return tasks.filter(isTaskFinishedForDay).length;
}

/** Все задачи дня доведены до финального статуса. */
export function isDayPlanTasksFinished(tasks: Task[]): boolean {
  if (tasks.length === 0) return false;
  return tasks.every(isTaskFinishedForDay);
}

export function isDayPlanReadyForCourt(tasks: Task[]): boolean {
  return isDayPlanTasksFinished(tasks) && tasks.every(isTaskProofReadyForCourt);
}

/** Локальное время вида H:mm или HH:mm → минуты от полуночи. */
export function parseLocalHmToMinutes(deadline: string): number | null {
  const m = deadline.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Дедлайн «до восьми вечера» включительно (последний слот дня по умолчанию). */
export const DAY_ORDER_EVENING_CAP_MINUTES = 20 * 60;

export function isDayPlanDeadlineByEightPm(deadline: string): boolean {
  const mins = parseLocalHmToMinutes(deadline);
  return mins !== null && mins <= DAY_ORDER_EVENING_CAP_MINUTES;
}

/** Сегодняшний план и текущее локальное время уже позже времени дедлайна. */
export function isPastDayPlanClockDeadline(plan: DayPlan, now: Date = new Date()): boolean {
  if (plan.date !== formatLocalDate(now)) return false;
  const mins = parseLocalHmToMinutes(plan.deadline);
  if (mins === null) return false;
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM > mins;
}

/** Порядковый номер дня пути среди сохранённых приказов дня (по дате), если на todayDate есть план. */
export function getPathDayOrdinal(todayDate: string, plans: DayPlan[]): number | null {
  if (!plans.length) return null;
  const sorted = [...plans].sort((a, b) => a.date.localeCompare(b.date));
  const i = sorted.findIndex((p) => p.date === todayDate);
  return i >= 0 ? i + 1 : null;
}

/** Номер дня при создании нового плана на todayDate: сколько планов было на более ранние даты + 1. */
export function getNextPathDayOrdinal(todayDate: string, plans: DayPlan[]): number {
  const before = plans.filter((p) => p.date < todayDate).length;
  return before + 1;
}

/** День «сорван»: дедлайн не позже 20:00, время прошло, приказ дня по задачам не закрыт. */
export function isDayOrderBlown(
  plan: DayPlan | null,
  tasks: Task[],
  now: Date = new Date()
): boolean {
  if (!plan) return false;
  if (!isDayPlanDeadlineByEightPm(plan.deadline)) return false;
  if (!isPastDayPlanClockDeadline(plan, now)) return false;
  return !isDayPlanReadyForCourt(tasks);
}
