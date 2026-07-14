'use client';

import { useTranslations } from 'next-intl';

interface SessionFormProps {
  onCreateDayPlan: () => void | Promise<void>;
  loading?: boolean;
}

export function SessionForm({ onCreateDayPlan, loading }: SessionFormProps) {
  const t = useTranslations('today');

  return (
    <div className="tactile-card mb-6 p-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-3">
          <span className="text-xl text-[var(--text-muted)]">◉</span>
        </div>
        <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
          {t('noDayPlan.title')}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">{t('noDayPlan.desc')}</p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onCreateDayPlan()}
        className="tactile-button tactile-button-primary w-full py-3 text-sm hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed"
      >
        {loading ? t('noDayPlan.btnLoading') : t('noDayPlan.btn')}
      </button>
    </div>
  );
}
