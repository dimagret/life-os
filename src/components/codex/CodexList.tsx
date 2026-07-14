'use client';

import { KnowledgeModule } from '@/types';
import { KnowledgeModuleCard } from './KnowledgeModuleCard';
import { BookOpen } from 'lucide-react';

interface UnlockProgress {
  focusBlocksCount: number;
  recoveryQuestsCount: number;
  courtReviewsCount: number;
  dayPlansCount: number;
  falseRestCount: number;
  closedDebtsCount: number;
  hasFailure: boolean;
}

interface CodexListProps {
  modules: KnowledgeModule[];
  progress: UnlockProgress;
  onOpenModule: (moduleId: string) => void;
}

export function CodexList({ modules, progress, onOpenModule }: CodexListProps) {
  const unlockedCount = modules.filter((m) => m.unlocked).length;
  const orderedModules = [...modules].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  const getRequirement = (module: KnowledgeModule): { done: number; total: number; label: string } | null => {
    switch (module.id) {
      case 'km-discipline-vs-motivation':
        return { done: progress.courtReviewsCount, total: 1, label: 'разбор дня' };
      case 'km-learning-without-action':
        return { done: progress.focusBlocksCount, total: 3, label: 'фокус-блока' };
      case 'km-recovery-after-failure':
        return {
          done: progress.recoveryQuestsCount > 0 || progress.hasFailure ? 1 : 0,
          total: 1,
          label: 'срыв или recovery quest',
        };
      case 'km-false-rest':
        return { done: progress.falseRestCount, total: 1, label: 'отметка ложного отдыха' };
      case 'km-self-promise':
        return { done: progress.closedDebtsCount, total: 1, label: 'закрытое обещание' };
      case 'km-goal-map-resource-action':
        return { done: progress.dayPlansCount, total: 1, label: 'собранный день' };
      case 'km-feedback-loop-action-correction':
        return { done: progress.courtReviewsCount, total: 1, label: 'разбор дня' };
      default:
        return null;
    }
  };

  const getProgressText = (module: KnowledgeModule): string => {
    if (module.unlocked) return '';
    const requirement = getRequirement(module);
    if (!requirement) return '';
    const left = Math.max(0, requirement.total - requirement.done);
    return left > 0 ? `Ещё ${left} · ${requirement.label}` : '';
  };

  const getProgressValue = (module: KnowledgeModule): string => {
    if (module.unlocked) return '';
    const requirement = getRequirement(module);
    if (!requirement) return '';
    return `${Math.min(requirement.done, requirement.total)}/${requirement.total}`;
  };

  return (
    <div className="space-y-6"
    >
      <div className="stat-strip p-4"
      >
        <p className="text-xs text-[var(--text-muted)]"
        >
          Открыто материалов: {unlockedCount} из {modules.length}
        </p>
      </div>

      {modules.length === 0 ? (
        <div className="tactile-card p-6 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-hover)] shadow-[var(--shadow-inset)]"
          >
            <BookOpen aria-hidden="true" className="text-[var(--text-muted)]" size={22} strokeWidth={1.8} />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]"
          >
            Материалы откроются после действий
          </h2>
          <p className="text-sm text-[var(--text-muted)]"
          >
            Кодекс не выдаётся за вход. Он открывается за выполнение.
          </p>
        </div>
      ) : (
        <div className="space-y-3"
        >
          {orderedModules.map((module) => (
            <KnowledgeModuleCard
              key={module.id}
              module={module}
              progressText={getProgressText(module)}
              progressValue={getProgressValue(module)}
              onOpen={onOpenModule}
            />
          ))}
        </div>
      )}
    </div>
  );
}

