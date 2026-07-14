'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface UsefulRestProps {
  onComplete: (howFeel: 'better' | 'same' | 'worse') => void;
  onSkip: () => void;
  /** Shown under subtitle after reflection (5–10 min guidance). */
  recoveryMinutesHint?: string;
  /** Override default skip label (e.g. “Continue without recovery”). */
  skipButtonLabel?: string;
}

const REST_OPTION_KEYS = ['walk', 'workout', 'nap', 'music', 'breathing'] as const;
const CUSTOM_REST_KEY = 'custom';

export function UsefulRest({
  onComplete,
  onSkip,
  recoveryMinutesHint,
  skipButtonLabel,
}: UsefulRestProps) {
  const [selectedRest, setSelectedRest] = useState<string | null>(null);
  const [customRest, setCustomRest] = useState('');
  const [phase, setPhase] = useState<'select' | 'feedback'>('select');
  const t = useTranslations('rest');
  const tc = useTranslations('common');

  const handleStartRest = () => {
    if (!selectedRest) return;
    if (selectedRest === CUSTOM_REST_KEY && !customRest.trim()) return;
    setPhase('feedback');
  };

  if (phase === 'select') {
    return (
      <div className="app-page flex flex-col justify-center">
        <div className="max-w-lg mx-auto w-full">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {t('subtitle')}
          </p>

          {recoveryMinutesHint ? (
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">{recoveryMinutesHint}</p>
          ) : null}

          <div className="space-y-3 mb-8">
            {REST_OPTION_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedRest(key)}
                className={`tactile-card w-full p-4 text-left transition-all ${
                  selectedRest === key
                    ? 'border-[var(--state-control-border)] bg-[var(--state-control-soft)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
                }`}
              >
                <span
                  className={`text-sm ${
                    selectedRest === key
                      ? 'text-[var(--state-control)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {t(`options.${key}`)}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedRest(CUSTOM_REST_KEY)}
              className={`tactile-card w-full p-4 text-left transition-all ${
                selectedRest === CUSTOM_REST_KEY
                  ? 'border-[var(--state-control-border)] bg-[var(--state-control-soft)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
              }`}
            >
              <span
                className={`text-sm ${
                  selectedRest === CUSTOM_REST_KEY
                    ? 'text-[var(--state-control)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {t('options.custom')}
              </span>
            </button>
            {selectedRest === CUSTOM_REST_KEY ? (
              <input
                type="text"
                value={customRest}
                onChange={(e) => setCustomRest(e.target.value)}
                placeholder={t('customPlaceholder')}
                className="tactile-field w-full p-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
              />
            ) : null}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="tactile-button tactile-button-secondary flex-1 py-3 text-sm hover:bg-[var(--bg-hover)]"
            >
              {skipButtonLabel ?? tc('skip')}
            </button>
            <button
              onClick={handleStartRest}
              disabled={!selectedRest || (selectedRest === CUSTOM_REST_KEY && !customRest.trim())}
              className={`tactile-button flex-1 py-3 text-sm transition-all ${
                selectedRest && (selectedRest !== CUSTOM_REST_KEY || customRest.trim())
                ? 'tactile-button-primary hover:opacity-90'
                  : 'bg-[var(--bg-hover)] text-[var(--text-disabled)] cursor-not-allowed'
              }`}
            >
              {tc('start')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page flex flex-col justify-center">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
          {t('feedbackTitle')}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          {t('feedbackSubtitle')}
        </p>

        <div className="space-y-3 mb-8">
          <button
            onClick={() => onComplete('better')}
            className="tactile-card w-full border-[var(--state-victory-border)] bg-[var(--state-victory-soft)] p-4 text-left transition-all hover:opacity-90"
          >
            <span className="text-sm text-[var(--state-victory)]">{t('better')}</span>
          </button>
          <button
            onClick={() => onComplete('same')}
            className="tactile-card w-full p-4 text-left transition-all hover:bg-[var(--bg-hover)]"
          >
            <span className="text-sm text-[var(--text-primary)]">{t('same')}</span>
          </button>
          <button
            onClick={() => onComplete('worse')}
            className="tactile-card w-full border-[var(--state-deception-border)] bg-[var(--state-deception-soft)] p-4 text-left transition-all hover:opacity-90"
          >
            <span className="text-sm text-[var(--state-deception)]">{t('worse')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
