import type { DayPlan, Task } from '@/types';
import { stripLegacyTodayFromTaskTitle } from '@/lib/utils';

const STATUS_LABELS: Record<Task['status'], string> = {
  planned: 'запланировано',
  in_progress: 'в процессе',
  completed: 'выполнено',
  partial: 'частично',
  failed: 'сорвано',
};

/** Текст для промпта наставника и локальных шаблонов: микроцель дня + срез задач. */
export function buildMentorDayBrief(dayPlan: DayPlan | null | undefined, tasks: Task[]): string | undefined {
  if (!dayPlan) return undefined;
  const parts: string[] = [];
  if (dayPlan.mainResult?.trim()) {
    parts.push(`Микроцель дня: ${dayPlan.mainResult.trim()}`);
  }
  if (tasks.length > 0) {
    const lines = tasks.map((t) => {
      const title = stripLegacyTodayFromTaskTitle(t.title);
      const mg = t.microGoal?.trim();
      return `· ${title} — ${STATUS_LABELS[t.status]}${mg ? `; фокус: ${mg}` : ''}`;
    });
    parts.push(`Задачи:\n${lines.join('\n')}`);
  }
  const s = parts.join('\n').trim();
  if (!s) return undefined;
  return s.length > 1500 ? `${s.slice(0, 1497)}…` : s;
}
