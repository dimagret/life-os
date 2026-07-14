'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Target } from 'lucide-react';

export function GoalsList() {
  const t = useTranslations('today');

  return (
    <div className="tactile-card mb-6 p-6">
      <div className="text-center mb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-hover)] shadow-[var(--shadow-inset)]">
          <Target aria-hidden="true" className="text-[var(--text-muted)]" size={22} strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
          {t('noGoal.title')}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">{t('noGoal.desc')}</p>
      </div>
      <Link
        href="/goals"
        className="tactile-button tactile-button-primary block w-full py-3 text-center text-sm hover:opacity-90"
      >
        {t('noGoal.btn')}
      </Link>
    </div>
  );
}
