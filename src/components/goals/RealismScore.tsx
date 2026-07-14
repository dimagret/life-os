'use client';

import { useTranslations } from 'next-intl';

interface RealismScoreProps {
  score: number;
}

type RealismVariant = 'control' | 'risk' | 'deception' | 'victory';

export function RealismScore({ score }: RealismScoreProps) {
  const t = useTranslations('analysisCard.realism');
  let labelKey: 'fantasy' | 'weak' | 'workingWithRisks' | 'good' | 'strong';
  let variant: RealismVariant;

  if (score <= 30) {
    labelKey = 'fantasy';
    variant = 'deception';
  } else if (score <= 50) {
    labelKey = 'weak';
    variant = 'risk';
  } else if (score <= 70) {
    labelKey = 'workingWithRisks';
    variant = 'risk';
  } else if (score <= 85) {
    labelKey = 'good';
    variant = 'victory';
  } else {
    labelKey = 'strong';
    variant = 'victory';
  }

  return (
    <div data-state={variant} className="tactile-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t('label')}
        </span>
        <span className="text-sm font-bold state-text">{score}/100</span>
      </div>
      <div
        className="progress-track mb-2 h-2.5 w-full"
        role="progressbar"
        aria-label={t('ariaLabel')}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill h-full state-dot" style={{ width: `${score}%` }} />
      </div>
      <p className="text-sm font-medium state-text">{t(labelKey)}</p>
    </div>
  );
}
