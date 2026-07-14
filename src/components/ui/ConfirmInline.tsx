'use client';

import { ReactNode } from 'react';

interface ConfirmInlineProps {
  open: boolean;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Inline confirmation block — replaces native window.confirm()
 * (которое на iOS Safari выглядит как фишинг и блокирует main thread).
 *
 * Use pattern:
 *   const [open, setOpen] = useState(false);
 *   <button onClick={() => setOpen(true)}>Reset</button>
 *   <ConfirmInline
 *     open={open}
 *     message="Action is irreversible."
 *     onConfirm={() => { reset(); setOpen(false); }}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export function ConfirmInline({
  open,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmInlineProps) {
  if (!open) return null;

  const isDanger = tone === 'danger';
  const containerClass = isDanger
    ? 'border-[var(--state-deception)] bg-[var(--state-deception-soft)]'
    : 'border-[var(--border-strong)] bg-[var(--bg-elevated)]';
  const textClass = isDanger
    ? 'text-[var(--state-deception)]'
    : 'text-[var(--text-primary)]';
  const confirmClass = isDanger
    ? 'bg-[var(--state-deception)] text-[var(--text-inverse)] hover:opacity-90'
    : 'bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90';

  return (
    <div role="alertdialog" aria-modal="false" className={`tactile-card p-4 ${containerClass}`}>
      <p className={`text-sm font-medium mb-3 ${textClass}`}>{message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="tactile-button tactile-button-secondary flex-1 py-2 text-sm hover:bg-[var(--bg-hover)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`tactile-button flex-1 py-2 text-sm ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
