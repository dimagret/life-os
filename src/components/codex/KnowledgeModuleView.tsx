'use client';

import { KnowledgeModule } from '@/types';
import { ArrowLeft } from 'lucide-react';

interface KnowledgeModuleViewProps {
  module: KnowledgeModule;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<KnowledgeModule['category'], string> = {
  discipline: 'Дисциплина',
  execution: 'Исполнение',
  recovery: 'Восстановление',
  focus: 'Фокус',
  self_deception: 'Искажение фактов',
};

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

export function KnowledgeModuleView({ module, onBack }: KnowledgeModuleViewProps) {
  const colors = CATEGORY_COLORS[module.category];

  // Parse content sections
  const sections = module.content.split('\n\n').filter(Boolean);

  return (
    <div className="app-page"
    >
      <header className="mb-6"
      >
        <button
          onClick={onBack}
          className="mb-4 flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
          Назад к Кодексу
        </button>
        <div className="flex items-center gap-2 mb-2"
        >
          <span
            className="text-xs px-2 py-0.5 rounded font-medium"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            {CATEGORY_LABELS[module.category]}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]"
        >
          {module.title}
        </h1>
      </header>

      <div className="space-y-6"
      >
        {sections.map((section, index) => {
          const lines = section.split('\n');
          const title = lines[0].replace(/^##\s*/, '');
          const isHeading = lines[0].startsWith('##');
          const content = isHeading ? lines.slice(1).join('\n') : section;

          if (isHeading) {
            return (
              <div key={index}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
                >
                  {title}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed"
                >
                  {content}
                </p>
              </div>
            );
          }

          return (
            <p key={index} className="text-sm text-[var(--text-secondary)] leading-relaxed"
            >
              {section}
            </p>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]"
      >
        <button
          onClick={onBack}
          className="tactile-button tactile-button-primary w-full py-3 text-sm hover:opacity-90"
        >
          Принять к действию
        </button>
      </div>
    </div>
  );
}
