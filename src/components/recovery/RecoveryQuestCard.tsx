'use client';

import { RecoveryQuest } from '@/types';
import { CheckCircle2 } from 'lucide-react';

interface RecoveryQuestCardProps {
  quest: RecoveryQuest;
  onComplete: (questId: string) => void;
}

export function RecoveryQuestCard({ quest, onComplete }: RecoveryQuestCardProps) {
  const isCompleted = quest.status === 'completed';
  const isFailed = quest.status === 'failed';

  return (
    <div
      className={`tactile-card p-5 ${
        isCompleted
          ? 'border-[var(--state-victory)] bg-[var(--state-victory-soft)]'
          : isFailed
            ? 'border-[var(--state-deception)] bg-[var(--state-deception-soft)]'
            : 'border-[var(--state-hold)] bg-[var(--state-hold-soft)]'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isCompleted
              ? 'var(--state-victory)'
              : isFailed
                ? 'var(--state-deception)'
                : 'var(--state-hold)',
          }}
        />
        <span
          className="text-sm font-semibold uppercase tracking-wider"
          style={{
            color: isCompleted
              ? 'var(--state-victory)'
              : isFailed
                ? 'var(--state-deception)'
                : 'var(--state-hold)',
          }}
        >
          {isCompleted ? 'Выполнен' : isFailed ? 'Не закрыт' : 'Восстановление'}
        </span>
      </div>

      <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">
        {quest.title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
        {quest.description}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <RewardBadge
          label="Опыт"
          value={`+${quest.xpRestore}`}
          variant="accent"
        />
        <RewardBadge
          label="Надёжность"
          value={`+${quest.innerCoreReward}`}
          variant="positive"
        />
        <RewardBadge
          label="Риск"
          value={`-${quest.abyssReduction}`}
          variant="recovery"
        />
      </div>

      {!isCompleted && !isFailed && (
        <button
          onClick={() => onComplete(quest.id)}
          className="tactile-button tactile-button-primary w-full py-3 text-sm hover:opacity-90"
        >
          Выполнить восстановление
        </button>
      )}

      {isCompleted && (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--state-victory)]">
          <CheckCircle2 aria-hidden="true" size={16} strokeWidth={1.8} />
          Выполнено
        </p>
      )}
    </div>
  );
}

function RewardBadge({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'accent' | 'positive' | 'recovery';
}) {
  const colors = {
    accent: 'text-[var(--accent-brand)] bg-[var(--accent-brand-soft)]',
    positive: 'text-[var(--state-victory)] bg-[var(--state-victory-soft)]',
    recovery: 'text-[var(--state-hold)] bg-[var(--state-hold-soft)]',
  };

  return (
    <div className={`rounded-lg p-2 text-center shadow-[var(--shadow-inset)] ${colors[variant]}`}>
      <p className="text-xs opacity-80 mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
