'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ProofInputProps {
  onSubmit: (type: 'text' | 'link', value: string) => void;
  onCancel: () => void;
}

export function ProofInput({ onSubmit, onCancel }: ProofInputProps) {
  const [proofType, setProofType] = useState<'text' | 'link'>('text');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const t = useTranslations('proof');

  const handleSubmit = () => {
    if (!value.trim()) {
      setError(t('errorEmpty'));
      return;
    }
    setError('');
    onSubmit(proofType, value.trim());
  };

  return (
    <div className="tactile-card space-y-3 p-4">
      <div className="flex gap-2">
        <button
          onClick={() => setProofType('text')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            proofType === 'text'
              ? 'state-bg state-text'
              : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
          }`}
        >
          {t('typeText')}
        </button>
        <button
          onClick={() => setProofType('link')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            proofType === 'link'
              ? 'state-bg state-text'
              : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
          }`}
        >
          {t('typeLink')}
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
        placeholder={t('placeholder')}
        className="tactile-field h-20 w-full resize-none p-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--state-color)]"
      />

      {error && (
        <p className="text-xs text-[var(--state-deception)]">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-lg border border-[var(--border-subtle)] py-2 text-xs font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)]"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSubmit}
          className="min-h-11 flex-1 rounded-lg bg-[var(--state-color)] py-2 text-xs font-medium text-[var(--text-inverse)] transition-all hover:opacity-90"
        >
          {t('save')}
        </button>
      </div>
    </div>
  );
}
