'use client';

import { useTranslations } from 'next-intl';
import { useTheme, type ThemePreference } from '@/lib/useTheme';
import { Moon, Sun, type LucideIcon } from 'lucide-react';

const LABEL_ID = 'theme-toggle-heading';

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const t = useTranslations('profile');

  const options: Array<{ value: ThemePreference; labelKey: 'themeDark' | 'themeLight'; Icon: LucideIcon }> = [
    { value: 'dark', labelKey: 'themeDark', Icon: Moon },
    { value: 'light', labelKey: 'themeLight', Icon: Sun },
  ];

  return (
    <fieldset className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 min-w-0 shadow-[var(--shadow-card)]">
      <legend id={LABEL_ID} className="px-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {t('theme')}
      </legend>
      <div
        className="grid grid-cols-2 gap-1 w-full -translate-y-0.5"
        role="radiogroup"
        aria-labelledby={LABEL_ID}
      >
        {options.map((opt) => {
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(opt.value)}
              className="selection-control flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-[background-color,box-shadow,color,transform] active:scale-[0.98] motion-reduce:transform-none"
            >
              <opt.Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
