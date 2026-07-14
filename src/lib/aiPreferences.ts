/**
 * Клиентские предпочтения: наставник только из локальных шаблонов (без вызова /api/ai).
 * Не трогает разбор целей и траекторию дня — только generateMentorMessageAsync.
 */

const OFFLINE_MENTOR_KEY = 'lifeos:mentor-offline-only';

export const MENTOR_OFFLINE_CHANGED_EVENT = 'lifeos-mentor-offline-changed';

export function getMentorOfflineOnly(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OFFLINE_MENTOR_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMentorOfflineOnly(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_MENTOR_KEY, value ? '1' : '0');
    window.dispatchEvent(new Event(MENTOR_OFFLINE_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeMentorOfflineOnly(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(MENTOR_OFFLINE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(MENTOR_OFFLINE_CHANGED_EVENT, handler);
}
