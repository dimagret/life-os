'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  FocusAccountabilityAnswers,
  FocusSessionReflection,
} from '@/types';

export function FocusAccountabilityDeepScreen({
  onSubmit,
}: {
  onSubmit: (answers: FocusAccountabilityAnswers) => void;
}) {
  const t = useTranslations('focus');
  const [whyNot, setWhyNot] = useState('');
  const [whatBlocked, setWhatBlocked] = useState('');
  const [objectiveOrSabotage, setObjectiveOrSabotage] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [minimalStep, setMinimalStep] = useState('');

  const canSubmit =
    whyNot.trim() &&
    whatBlocked.trim() &&
    objectiveOrSabotage.trim() &&
    tomorrowPlan.trim() &&
    minimalStep.trim();

  return (
    <div className="app-page flex flex-col justify-center">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">{t('accountabilityDeepTitle')}</h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">{t('accountabilityDeepIntro')}</p>

        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('accountabilityDeepQ1')}</span>
          <textarea
            value={whyNot}
            onChange={(e) => setWhyNot(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('accountabilityDeepQ2')}</span>
          <textarea
            value={whatBlocked}
            onChange={(e) => setWhatBlocked(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('accountabilityDeepQ3')}</span>
          <textarea
            value={objectiveOrSabotage}
            onChange={(e) => setObjectiveOrSabotage(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('accountabilityDeepQ4')}</span>
          <textarea
            value={tomorrowPlan}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>
        <label className="block mb-6">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('accountabilityDeepQ5')}</span>
          <textarea
            value={minimalStep}
            onChange={(e) => setMinimalStep(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              whyNot: whyNot.trim(),
              whatBlocked: whatBlocked.trim(),
              objectiveOrSabotage: objectiveOrSabotage.trim(),
              tomorrowPlan: tomorrowPlan.trim(),
              minimalStep: minimalStep.trim(),
            })
          }
          className={`tactile-button w-full py-4 text-sm ${
            canSubmit
              ? 'bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90'
              : 'bg-[var(--bg-hover)] text-[var(--text-disabled)] cursor-not-allowed'
          }`}
        >
          {t('accountabilityDeepSubmit')}
        </button>
      </div>
    </div>
  );
}

export function FocusReflectionScreen({ onSubmit }: { onSubmit: (r: FocusSessionReflection) => void }) {
  const t = useTranslations('focus');
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [future, setFuture] = useState('');

  const handleSubmit = () => {
    onSubmit({
      whatDistracted: what.trim(),
      whyItHappened: why.trim(),
      futureHelpFactors: future.trim(),
    });
  };

  const canSubmit = what.trim().length > 0 && why.trim().length > 0 && future.trim().length > 0;

  return (
    <div className="app-page flex flex-col justify-center">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">{t('reflectTitle')}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">{t('reflectIntro')}</p>

        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('reflectWhat')}</span>
          <textarea
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('reflectWhy')}</span>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>
        <label className="block mb-6">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('reflectFuture')}</span>
          <textarea
            value={future}
            onChange={(e) => setFuture(e.target.value)}
            rows={2}
            className="tactile-field mt-1 w-full resize-none p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
          />
        </label>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`tactile-button w-full py-4 text-sm ${
            canSubmit
              ? 'bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90'
              : 'bg-[var(--bg-hover)] text-[var(--text-disabled)] cursor-not-allowed'
          }`}
        >
          {t('reflectContinue')}
        </button>
      </div>
    </div>
  );
}

export function FocusOptionalCommentScreen({
  onSubmit,
}: {
  onSubmit: (text: string) => void;
}) {
  const t = useTranslations('focus');
  const [comment, setComment] = useState('');

  return (
    <div className="app-page flex flex-col justify-center">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">{t('optionalTitle')}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">{t('optionalIntro')}</p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('optionalPlaceholder')}
          rows={4}
          className="tactile-field mb-4 w-full resize-none p-4 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onSubmit(comment)}
            className="tactile-button tactile-button-primary w-full py-4 text-sm hover:opacity-90"
          >
            {t('optionalSave')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit('')}
            className="tactile-button tactile-button-secondary w-full py-3 text-sm hover:bg-[var(--bg-hover)]"
          >
            {t('optionalSkip')}
          </button>
        </div>
      </div>
    </div>
  );
}
