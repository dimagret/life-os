'use client';

import { Debt } from '@/types';
import { CheckCircle2 } from 'lucide-react';

interface DebtsListProps {
  debts: Debt[];
  onCloseDebt: (debtId: string) => void;
}

const DEBT_TYPE_LABELS: Record<Debt['type'], string> = {
  small: 'Малый',
  medium: 'Средний',
  critical: 'Критический',
  systemic: 'Системный',
};

const DEBT_TYPE_COLORS: Record<Debt['type'], { border: string; bg: string; text: string }> = {
  small: {
    border: 'var(--state-hold)',
    bg: 'var(--state-hold-soft)',
    text: 'var(--state-hold)',
  },
  medium: {
    border: 'var(--state-risk)',
    bg: 'var(--state-risk-soft)',
    text: 'var(--state-risk)',
  },
  critical: {
    border: 'var(--state-deception)',
    bg: 'var(--state-deception-soft)',
    text: 'var(--state-deception)',
  },
  systemic: {
    border: 'var(--state-stabilization)',
    bg: 'var(--state-stabilization-soft)',
    text: 'var(--state-stabilization)',
  },
};

export function DebtsList({ debts, onCloseDebt }: DebtsListProps) {
  const openDebts = debts.filter((d) => d.status === 'open');
  const closedDebts = debts.filter((d) => d.status === 'closed');

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Незакрытые обещания
      </h2>

      {openDebts.length === 0 && closedDebts.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Нет незакрытых обещаний.
        </p>
      )}

      <div className="space-y-2">
        {openDebts.map((debt) => {
          const colors = DEBT_TYPE_COLORS[debt.type];
          return (
            <div
              key={debt.id}
              className="tactile-card p-4"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {debt.title}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {DEBT_TYPE_LABELS[debt.type]}
                </span>
              </div>
              <button
                onClick={() => onCloseDebt(debt.id)}
                className="min-h-11 w-full rounded-lg border py-2 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: 'transparent',
                }}
              >
                Закрыть обещание
              </button>
            </div>
          );
        })}
      </div>

      {closedDebts.length > 0 && (
        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-muted)] mb-2">Закрытые обещания</p>
          <div className="space-y-2">
            {closedDebts.map((debt) => (
              <div
                key={debt.id}
                className="tactile-card p-3 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {debt.title}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    {DEBT_TYPE_LABELS[debt.type]}
                    <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.8} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
