'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { STORAGE_KEYS } from '@/lib/constants';
import { routing } from '@/i18n/routing';

const LOCALE_KEY = STORAGE_KEYS.locale;

const LABEL_ID = 'locale-toggle-heading';

const options: Array<{ value: 'ru' | 'en'; label: string }> = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

/**
 * Locale switcher: navigates between `/` (RU) and `/en` (EN) preserving
 * the current pathname. Persists choice to localStorage.
 */
export function LocaleToggle() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: 'ru' | 'en') => {
    if (next === locale) return;
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // ignored
    }
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <fieldset className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 min-w-0 shadow-[var(--shadow-card)]">
      <legend id={LABEL_ID} className="px-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {t('language')}
      </legend>
      <div
        className="grid grid-cols-2 gap-1 w-full -translate-y-0.5"
        role="radiogroup"
        aria-labelledby={LABEL_ID}
      >
        {options.filter((o) => routing.locales.includes(o.value)).map((opt) => {
          const active = locale === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={isPending}
              onClick={() => switchTo(opt.value)}
              className="selection-control flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-xs font-medium transition-[background-color,box-shadow,color,transform] active:scale-[0.98] motion-reduce:transform-none"
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
