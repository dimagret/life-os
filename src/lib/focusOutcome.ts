/** Итог по полю «результат блока» для ветвления ответственность / отдых. */
export type FocusResultOutcome = 'negative' | 'partial' | 'positive';

/**
 * Пустой или явно негативный ответ → negative (блок ответственности).
 * Частичное выполнение → partial (как успех: отдых → комментарий).
 */
export function inferFocusOutcome(raw: string): FocusResultOutcome {
  const t = raw.trim().toLowerCase();
  if (!t) return 'negative';

  const phrases = [
    'ничего',
    'ничего не',
    'ничего не сделал',
    'не сделал',
    'не выполнил',
    'не получилось',
    'нет результата',
    'без результата',
    'никак',
    'не сделано',
    'провал',
    'не могу',
    'не смог',
  ];
  for (const p of phrases) {
    if (t === p || t.includes(p)) return 'negative';
  }

  if (/^0+$/.test(t)) return 'negative';

  const partial = ['половин', 'частично', 'немного', 'наполовину', 'частичн'];
  if (partial.some((p) => t.includes(p))) return 'partial';

  return 'positive';
}
