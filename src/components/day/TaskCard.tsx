'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Task } from '@/types';
import { stripLegacyTodayFromTaskTitle } from '@/lib/utils';
import { ProofInput } from './ProofInput';
import { CheckCircle2, Circle, CircleDot, Timer, XCircle, type LucideIcon } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  roleLabel?: string;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onAddProof: (taskId: string, type: 'text' | 'link', value: string) => void;
  onStartFocus?: (task: Task) => void;
}

const statusIcons: Record<Task['status'], LucideIcon> = {
  planned: Circle,
  in_progress: Timer,
  completed: CheckCircle2,
  partial: CircleDot,
  failed: XCircle,
};

const statusToState: Record<Task['status'], string> = {
  planned: '',
  in_progress: 'hold',
  completed: 'victory',
  partial: 'risk',
  failed: 'deception',
};

export function TaskCard({ task, roleLabel, onUpdate, onAddProof, onStartFocus }: TaskCardProps) {
  const [showProofInput, setShowProofInput] = useState(false);
  const [microDraftOverride, setMicroDraftOverride] = useState<{ taskId: string; value: string } | null>(null);
  const microDraft =
    microDraftOverride?.taskId === task.id ? microDraftOverride.value : task.microGoal ?? '';
  const t = useTranslations('task');

  const handleStatusChange = (status: Task['status']) => {
    if (status === 'completed' && task.proofRequired && !task.proof) {
      setShowProofInput(true);
      return;
    }

    const patch: Partial<Task> = { status };
    if (status === 'completed') {
      patch.completedAt = new Date().toISOString();
    } else {
      patch.completedAt = undefined;
    }
    onUpdate(task.id, patch);
  };

  const handleProofSubmit = (type: 'text' | 'link', value: string) => {
    onAddProof(task.id, type, value);
    setShowProofInput(false);
  };

  const isClosed = task.status === 'completed' || task.status === 'partial' || task.status === 'failed';
  const hasProof = !!task.proof;
  const completedBlockedByProof = task.proofRequired && !hasProof;
  const StatusIcon = statusIcons[task.status];

  return (
    <div className="tactile-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tactile-chip px-2 py-0.5 text-xs leading-snug">
            {t(`types.${task.type}`)}
          </span>
          <span className="tactile-chip px-2 py-0.5 text-xs leading-snug">
            {t(`importance.${task.importance}`)}
          </span>
          {roleLabel ? (
            <span className="tactile-chip px-2 py-0.5 text-xs leading-snug">
              {roleLabel}
            </span>
          ) : null}
          {task.plannedMinutes ? (
            <span className="tactile-chip px-2 py-0.5 text-xs leading-snug">
              {t('plannedMinutes', { minutes: task.plannedMinutes })}
            </span>
          ) : null}
        </div>
        <span
          data-state={statusToState[task.status] || undefined}
          className={`shrink-0 text-xs font-medium inline-flex items-center gap-1 leading-snug ${
            statusToState[task.status] ? 'state-text' : 'text-[var(--text-muted)]'
          }`}
        >
          <StatusIcon aria-hidden="true" size={14} strokeWidth={1.8} />
          {t(`status.${task.status}`)}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)] leading-snug">
          {stripLegacyTodayFromTaskTitle(task.title)}
        </h3>

        {isClosed && task.microGoal?.trim() ? (
          <div className="tactile-inset space-y-1.5 p-3">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block leading-snug">
              {t('stageMicroLabel')}
            </span>
            <p className="text-xs text-[var(--text-secondary)] leading-[1.5] whitespace-pre-line">
              {task.microGoal.trim()}
            </p>
          </div>
        ) : null}

        {!isClosed && (
          <div className="space-y-1.5">
            <label
              htmlFor={`task-micro-${task.id}`}
              className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block leading-snug"
            >
              {t('stageMicroLabel')}
            </label>
            <textarea
              id={`task-micro-${task.id}`}
              value={microDraft}
              onChange={(e) => setMicroDraftOverride({ taskId: task.id, value: e.target.value })}
              onBlur={() => {
                const next = microDraft.trim();
                const prev = (task.microGoal ?? '').trim();
                if (next !== prev) {
                  onUpdate(task.id, { microGoal: next || undefined });
                }
                setMicroDraftOverride(null);
              }}
              placeholder={t('stageMicroPlaceholder')}
              rows={2}
              className="tactile-field w-full resize-none p-2 text-xs leading-[1.5] placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--state-color)]"
            />
          </div>
        )}

        {task.proofRequired && !hasProof && (
          <div className="space-y-2">
            <span className="text-[10px] font-medium text-[var(--state-risk)] block leading-snug">
              {t('proofRequired')}
            </span>
            <button
              type="button"
              onClick={() => setShowProofInput(!showProofInput)}
              className="inline-flex min-h-11 items-center text-xs state-text hover:opacity-80 transition-opacity leading-snug"
            >
              {t('addProof')}
            </button>
            {showProofInput && (
              <ProofInput
                onSubmit={handleProofSubmit}
                onCancel={() => setShowProofInput(false)}
              />
            )}
          </div>
        )}

        {hasProof && (
          <div className="tactile-inset space-y-1.5 p-3">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block leading-snug">
              {t('proofLabel')}
            </span>
            <p className="text-xs text-[var(--text-secondary)] truncate leading-[1.5]">
              {task.proof?.value}
            </p>
          </div>
        )}

        {onStartFocus && !isClosed && (
          <button
            type="button"
            onClick={() => onStartFocus(task)}
            className="min-h-11 w-full rounded-lg state-bg py-2 text-xs font-medium leading-snug state-text transition-all hover:opacity-90"
          >
            {t('startFocus')}
          </button>
        )}

        {isClosed ? (
          <button
            type="button"
            onClick={() => handleStatusChange('planned')}
            className="min-h-11 w-full rounded-lg border border-[var(--border-subtle)] py-2 text-xs font-medium leading-snug text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)]"
          >
            {t('btnReopen')}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange('in_progress')}
              className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] leading-snug"
            >
              {t('btnInProgress')}
            </button>
            <button
              type="button"
              disabled={completedBlockedByProof}
              aria-disabled={completedBlockedByProof}
              onClick={() => handleStatusChange('completed')}
              className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-[var(--state-victory-soft)] text-[var(--state-victory)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:opacity-45 leading-snug"
            >
              {t('btnCompleted')}
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('partial')}
              className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-[var(--state-risk-soft)] text-[var(--state-risk)] hover:opacity-90 leading-snug"
            >
              {t('btnPartial')}
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('failed')}
              className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-[var(--state-deception-soft)] text-[var(--state-deception)] hover:opacity-90 leading-snug"
            >
              {t('btnFailed')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}