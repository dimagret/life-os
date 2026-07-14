'use client';

import { useTranslations } from 'next-intl';
import styles from './Onboarding.module.css';

interface WelcomeScreenProps {
  result: string;
  error: string;
  onResultChange: (value: string) => void;
  onNext: () => void;
}

export function WelcomeScreen({
  result,
  error,
  onResultChange,
  onNext,
}: WelcomeScreenProps) {
  const t = useTranslations('onboarding');
  const canProceed = result.trim().length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canProceed) onNext();
  };

  return (
    <main className={styles.panel}>
      <div className={styles.heading}>
        <p className={styles.kicker}>{t('result.kicker')}</p>
        <h1>{t('result.title')}</h1>
        <p>{t('result.description')}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>{t('result.label')}</span>
          <textarea
            value={result}
            onChange={(event) => onResultChange(event.target.value)}
            placeholder={t('result.placeholder')}
            rows={4}
            maxLength={240}
            autoFocus
            aria-describedby="first-run-result-hint"
            aria-invalid={Boolean(error)}
          />
          <small id="first-run-result-hint">{t('result.hint')}</small>
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.primary} disabled={!canProceed}>
          {t('result.cta')}
        </button>
      </form>
    </main>
  );
}
