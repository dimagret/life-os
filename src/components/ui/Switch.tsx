'use client';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  /** id элемента с подписью (текст слева от тумблера). */
  'aria-labelledby': string;
}

/**
 * Лаконичный переключатель под токены темы Life OS (без внешних библиотек).
 */
export function Switch({ checked, onCheckedChange, 'aria-labelledby': labelledBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onCheckedChange(!checked)}
      className={[
        'relative inline-flex min-h-11 w-16 shrink-0 items-center rounded-xl border p-1',
        'transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 ease-out active:scale-[0.98] motion-reduce:transform-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]',
        checked
          ? 'border-[var(--state-border)] bg-[var(--bg-secondary)] opacity-100 shadow-[var(--shadow-card)]'
          : 'border-[var(--switch-off-border)] bg-[var(--switch-off-track)] opacity-100 shadow-[var(--shadow-inset)]',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'pointer-events-none block h-8 w-8 rounded-lg transition-[background-color,box-shadow,transform] duration-200 ease-out',
          checked
            ? 'translate-x-6 bg-[var(--state-color)] shadow-[var(--shadow-raised)]'
            : 'translate-x-0 bg-[var(--switch-off-thumb)] shadow-[var(--shadow-raised)]',
        ].join(' ')}
      />
    </button>
  );
}
