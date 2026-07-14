'use client';

import { useTranslations } from 'next-intl';
import { KnowledgeModule } from '@/types';

interface KnowledgeModuleCardProps {
  module: KnowledgeModule;
  progressText?: string;
  progressValue?: string;
  onOpen: (moduleId: string) => void;
}

/** First line of module body: strip markdown heading markers, lowercase for card preview. */
function previewFirstLine(content: string): string {
  const line = content.split('\n')[0]?.trim() ?? '';
  return line.replace(/^#{1,6}\s*/, '').trim().toLowerCase();
}

const CATEGORY_COLORS: Record<KnowledgeModule['category'], { border: string; bg: string; text: string }> = {
  discipline: {
    border: 'var(--state-hold)',
    bg: 'var(--state-hold-soft)',
    text: 'var(--state-hold)',
  },
  execution: {
    border: 'var(--accent-brand)',
    bg: 'var(--accent-brand-soft)',
    text: 'var(--accent-brand)',
  },
  recovery: {
    border: 'var(--state-victory)',
    bg: 'var(--state-victory-soft)',
    text: 'var(--state-victory)',
  },
  focus: {
    border: 'var(--state-risk)',
    bg: 'var(--state-risk-soft)',
    text: 'var(--state-risk)',
  },
  self_deception: {
    border: 'var(--state-deception)',
    bg: 'var(--state-deception-soft)',
    text: 'var(--state-deception)',
  },
};

export function KnowledgeModuleCard({ module, progressText, progressValue, onOpen }: KnowledgeModuleCardProps) {
  const t = useTranslations('codex');
  const colors = CATEGORY_COLORS[module.category];

  if (!module.unlocked) {
    return (
      <div className="tactile-card p-5 opacity-70"
      >
        <div className="flex items-center justify-between mb-2"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]"
          >
            {module.title}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] font-medium"
          >
            {t('locked')}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-2"
        >
          {module.unlockCondition}
        </p>
        <div className="flex items-center justify-between">
          {progressValue && (
            <span className="text-xs font-medium text-[var(--accent-brand)]"
            >
              {progressValue}
            </span>
          )}
          {progressText && (
            <span className="text-xs text-[var(--text-muted)]"
            >
              {progressText}
            </span>
          )}
        </div>
        <button
          disabled
          className="mt-3 min-h-11 w-full rounded-lg border border-[var(--border-subtle)] py-2 text-xs font-medium text-[var(--text-muted)] opacity-50 cursor-not-allowed"
        >
          {t('unlockHint')}
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="tactile-card cursor-pointer p-5 transition-all hover:opacity-90"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.bg,
      }}
      onClick={() => onOpen(module.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(module.id);
        }
      }}
    >
      <div className="flex items-center justify-between mb-2"
      >
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
          }}
        >
          {t(`category.${module.category}`)}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug text-[var(--text-primary)] mb-1.5">
        {module.title}
      </h3>
      <p className="text-sm leading-snug text-[var(--text-muted)] opacity-80 line-clamp-2 mb-3 mt-1">
        {previewFirstLine(module.content)}
      </p>
      <span
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border py-2 text-xs font-medium transition-all hover:opacity-80"
        style={{
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: 'transparent',
        }}
      >
        {t('open')}
      </span>
    </div>
  );
}
