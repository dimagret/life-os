'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { MentorTipSource } from '@/hooks/useMentorGeneration';

interface MentorChatProps {
  mentorTip: string;
  mentorTipSource?: MentorTipSource;
  stateLabel: string;
  currentState: string;
}

function sourceFootnote(t: ReturnType<typeof useTranslations>, source: MentorTipSource): string {
  switch (source) {
    case 'ai':
      return t('mentorSourceAi');
    case 'offline_pref':
      return t('mentorSourceOffline');
    default:
      return t('mentorSourceMock');
  }
}

export function MentorChat({
  mentorTip,
  mentorTipSource = 'mock',
  stateLabel,
  currentState,
}: MentorChatProps) {
  const t = useTranslations('today');
  return (
    <div
      data-state={currentState}
      className="mentor-card mb-6 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mentor-icon-tile flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
          <Sparkles className="h-5 w-5 state-text" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full state-dot" />
            <span className="text-[10px] font-semibold uppercase tracking-wider state-text">
              {stateLabel}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line" aria-live="polite">
            {mentorTip}
          </p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="mt-3 h-5 w-5 shrink-0 text-[var(--text-muted)]"
          strokeWidth={1.8}
        />
      </div>
      <p className="mt-3 pl-14 text-[10px] leading-relaxed text-[var(--text-muted)]" aria-live="polite">
        {sourceFootnote(t, mentorTipSource)}
      </p>
    </div>
  );
}
