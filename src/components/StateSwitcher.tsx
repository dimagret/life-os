'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UiState } from '@/types';
import { statePriority } from '@/lib/uiState';
import { useShell } from '@/lib/shell-context';

export function StateSwitcher() {
  const tState = useTranslations('stateLabels');
  const tSwitch = useTranslations('stateSwitcher');
  const { currentState: current, setCurrentState } = useShell();
  const [isOpen, setIsOpen] = useState(false);

  const handleStateChange = (state: UiState) => {
    setCurrentState(state);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={tSwitch('aria', { state: tState(current) })}
        data-state={current}
        className="flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] state-bg state-border-active state-text"
      >
        <span aria-hidden="true" className="w-2 h-2 rounded-full state-dot" />
        {tState(current)}
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-card)]"
        >
          {statePriority.map((state) => {
            const isCurrent = current === state;
            return (
              <li key={state} role="option" aria-selected={isCurrent}>
                <button
                  type="button"
                  onClick={() => handleStateChange(state)}
                  data-state={state}
                  data-active={isCurrent ? 'true' : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[var(--bg-hover)] ${
                    isCurrent ? 'state-text' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <span aria-hidden="true" className="w-2 h-2 rounded-full flex-shrink-0 state-dot" />
                  {tState(state)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
