'use client';

import { useEffect } from 'react';

/**
 * Показывает ошибку вместо «белого экрана», если сегмент упал при рендере или в клиентском дереве.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Life OS]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto text-center">
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Что-то пошло не так</h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Откройте консоль браузера (F12 → Console) — там текст ошибки. Частые причины: повреждённые данные в
        localStorage, блокировка скриптов расширением, неверный адрес страницы.
      </p>
      <pre className="text-xs text-left w-full p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--state-deception)] overflow-auto mb-4">
        {error.message}
      </pre>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent-brand)] text-[var(--text-inverse)] cursor-pointer"
      >
        Попробовать снова
      </button>
    </div>
  );
}
