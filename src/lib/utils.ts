export function generateId(prefix?: string): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  return prefix ? `${prefix}_${id}` : id;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getTodayDate(): string {
  return formatLocalDate(new Date());
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.warn('[lifeos] Corrupted stored value, using fallback:', e);
    return fallback;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const LEGACY_TASK_TITLE_TODAY_RU = /\s*\(сегодня\)\s*$/i;
const LEGACY_TASK_TITLE_TODAY_EN = /\s*\(today\)\s*$/i;

/** Убирает устаревший суффикс «(сегодня)»/«(today)» из заголовка задачи (старые данные в storage). */
export function stripLegacyTodayFromTaskTitle(raw: string): string {
  return raw.replace(LEGACY_TASK_TITLE_TODAY_RU, '').replace(LEGACY_TASK_TITLE_TODAY_EN, '').trim();
}

/** Убирает из «Плана» задачи префиксы недели/трека; остаётся дневная формулировка для карточек и разбора дня. */
export function stripTrajectoryContextPrefix(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  let s = raw.trim();

  s = s.replace(/^Недельный ориентир \(не дневная задача\):[\s\S]+?\.\s*(?=Сегодня\b)/u, '');
  s = s.replace(
    /^Weekly orientation \(not today[^)]*\):\s*[\s\S]+?\.\s*(?=For today\b)/iu,
    ''
  );

  s = s
    .replace(/^Контекст трека:\s*«[^»]*»\.\s*/u, '')
    .replace(/^День\s+\d+\s+по пути к\s*«[^»]*»\.\s*/u, '')
    .replace(/^Weekly track context:\s*[\u201c"][^"\u201d]+[\u201d"]\.\s*/u, '')
    .replace(/^Weekly track context:\s*"[^"]+"\.\s*/u, '')
    .replace(/^Day\s+\d+\s+on the path to\s*[\u201c"][^"\u201d]+[\u201d"]\.\s*/u, '')
    .replace(/^Day\s+\d+\s+on the path to\s*"[^"]+"\.\s*/u, '');

  return s.trim();
}

