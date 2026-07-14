'use client';

import { ArrowLeft, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FirstRunDraft } from '@/lib/firstRun';
import styles from './Onboarding.module.css';

interface ContractScreenProps {
  draft: FirstRunDraft;
  accepted: boolean;
  isSubmitting: boolean;
  error: string;
  onAcceptedChange: (accepted: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function ContractScreen({
  draft,
  accepted,
  isSubmitting,
  error,
  onAcceptedChange,
  onBack,
  onSubmit,
}: ContractScreenProps) {
  const t = useTranslations('onboarding');
  const steps = [
    draft.trajectory.learningTitle,
    draft.trajectory.practiceTitle,
    draft.trajectory.outputTitle,
  ];

  return (
    <main className={`${styles.panel} ${styles.reviewPanel}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" />
        <span>{t('review.back')}</span>
      </button>

      <div className={styles.heading}>
        <p className={styles.kicker}>{t('review.kicker')}</p>
        <h1>{t('review.title')}</h1>
        <p>{t('review.description')}</p>
      </div>

      <section className={styles.planPreview} aria-label={t('review.previewAria')}>
        <div className={styles.previewResult}>
          <span>{t('review.weeklyGoal')}</span>
          <strong>{draft.weeklyGoal}</strong>
        </div>
        <div className={styles.previewResult}>
          <span>{t('review.todayResult')}</span>
          <strong>{draft.todayResult}</strong>
        </div>
        <ol className={styles.stepList}>
          {steps.map((step, index) => (
            <li key={step}>
              <span className={styles.stepNumber}>0{index + 1}</span>
              <span className={styles.stepPeriod}>{t(`review.periods.${index}` as never)}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.contract} aria-labelledby="honest-day-rules">
        <h2 id="honest-day-rules">{t('review.contractTitle')}</h2>
        <ul>
          {[0, 1, 2].map((index) => (
            <li key={index}>
              <Check size={13} aria-hidden="true" />
              <span>{t(`review.rules.${index}` as never)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.reviewActions}>
        <label className={styles.acceptance}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => onAcceptedChange(event.target.checked)}
          />
          <span>{t('review.accept')}</span>
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button
          type="button"
          className={styles.primary}
          disabled={!accepted || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? t('review.saving') : t('review.cta')}
        </button>
      </div>
    </main>
  );
}
