'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Task } from '@/types';
import {
  buildFirstRunDraft,
  completeFirstRun,
  type FirstRunDraft,
  type FirstRunLocale,
} from '@/lib/firstRun';
import { WelcomeScreen } from './WelcomeScreen';
import { ContractScreen } from './ContractScreen';
import styles from './Onboarding.module.css';

type OnboardingStep = 'result' | 'review';

interface OnboardingFlowProps {
  onComplete: (firstTask: Task) => void;
}

const steps: OnboardingStep[] = ['result', 'review'];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const t = useTranslations('onboarding');
  const tToday = useTranslations('today');
  const rawLocale = useLocale();
  const locale: FirstRunLocale = rawLocale === 'en' ? 'en' : 'ru';
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('result');
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState<FirstRunDraft | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitGuard = useRef(false);
  const currentIndex = steps.indexOf(currentStep);

  const handleResultChange = (value: string) => {
    setResult(value);
    setError('');
    if (draft && value.trim() !== draft.result) {
      setDraft(null);
      setAccepted(false);
    }
  };

  const handlePreview = () => {
    try {
      setDraft(buildFirstRunDraft(result, locale));
      setAccepted(false);
      setError('');
      setCurrentStep('review');
    } catch {
      setError(t('result.required'));
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep('result');
  };

  const handleSubmit = async () => {
    if (!draft || !accepted || submitGuard.current) return;
    submitGuard.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const completed = completeFirstRun({
        draft,
        locale,
        contractAccepted: accepted,
        tToday: (key, values) => tToday(key as never, values as never),
      });
      onComplete(completed.firstTask);
    } catch {
      setError(t('review.saveError'));
      setIsSubmitting(false);
      submitGuard.current = false;
    }
  };

  return (
    <section className={styles.shell} aria-label={t('aria')}>
      <header className={styles.progress}>
        <div className={styles.progressTrack} aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={step}
              className={styles.progressSegment}
              data-active={index <= currentIndex ? 'true' : undefined}
            />
          ))}
        </div>
        <span className={styles.progressCount}>
          {t('progress', { current: currentIndex + 1, total: steps.length })}
        </span>
      </header>

      <div className={styles.stage} key={currentStep}>
        {currentStep === 'result' ? (
          <WelcomeScreen
            result={result}
            error={error}
            onResultChange={handleResultChange}
            onNext={handlePreview}
          />
        ) : draft ? (
          <ContractScreen
            draft={draft}
            accepted={accepted}
            isSubmitting={isSubmitting}
            error={error}
            onAcceptedChange={setAccepted}
            onBack={handleBack}
            onSubmit={handleSubmit}
          />
        ) : null}
      </div>
    </section>
  );
}
