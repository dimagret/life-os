'use client';

import { useTranslations } from 'next-intl';
import { ActionCourtReview } from '@/types';
import { loadDayPlans } from '@/lib/storage';

interface YesterdayReviewCardProps {
  review: ActionCourtReview;
}

export function YesterdayReviewCard({ review }: YesterdayReviewCardProps) {
  const t = useTranslations('today');
  const tomorrowAdjustment = loadDayPlans()
    .find((plan) => plan.id === review.dayPlanId)
    ?.tomorrowAdjustment?.trim();

  const verdictColor =
    review.verdict === 'self_victory' || review.verdict === 'recovered_victory'
      ? 'var(--state-victory)'
      : review.verdict === 'self_deception'
        ? 'var(--state-deception)'
        : 'var(--text-secondary)';

  return (
    <div className="tactile-card mb-4 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-muted)]">{t('yesterday')}</span>
        <span className="text-xs font-medium" style={{ color: verdictColor }}>
          {t(`verdicts.${review.verdict}`)}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        {review.xpDelta > 0 ? '+' : ''}
        {review.xpDelta} XP · {t('metrics.core')} {review.innerCoreDelta > 0 ? '+' : ''}
        {review.innerCoreDelta} · {t('metrics.abyss')} {review.abyssIndexDelta > 0 ? '+' : ''}
        {review.abyssIndexDelta}
      </p>
      {tomorrowAdjustment ? (
        <div className="mt-3 rounded-lg border border-[var(--state-hold)] bg-[var(--state-hold-soft)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--state-hold)]">
            {t('tomorrowAdjustmentTitle')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)]">
            {tomorrowAdjustment}
          </p>
        </div>
      ) : null}
    </div>
  );
}

