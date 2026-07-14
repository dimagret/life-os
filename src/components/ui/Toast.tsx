'use client';

import { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  open: boolean;
  message: ReactNode;
  /** Optional Undo button. */
  actionLabel?: string;
  onAction?: () => void;
  /** Auto-dismiss after this many ms. Default 5000. */
  durationMs?: number;
  onDismiss: () => void;
  tone?: 'neutral' | 'danger';
}

/**
 * Minimal in-app toast. Anchored bottom on mobile, bottom-left on desktop.
 * No portal, no library — single element on top of the layout.
 */
export function Toast({
  open,
  message,
  actionLabel,
  onAction,
  durationMs = 5000,
  onDismiss,
  tone = 'neutral',
}: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    let isActive = true;
    function run() {
      if (!open) {
        if (isActive) setProgress(100);
        return;
      }
      const start = Date.now();
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
        setProgress(remaining);
        if (elapsed >= durationMs) {
          window.clearInterval(interval);
          onDismiss();
        }
      }, 100);
      return () => window.clearInterval(interval);
    }
    const cleanup = run();
    return () => { isActive = false; cleanup?.(); };
  }, [open, durationMs, onDismiss]);

  if (!open) return null;

  const toneClasses =
    tone === 'danger'
      ? 'border-[var(--state-deception)] bg-[var(--state-deception-soft)]'
      : 'border-[var(--border-strong)] bg-[var(--bg-elevated)]';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-xl border shadow-[var(--shadow-card)] lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm ${toneClasses}`}
    >
      <div className="flex items-center gap-3 p-3">
        <span className="flex-1 text-sm text-[var(--text-primary)]">{message}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={() => {
              onAction();
              onDismiss();
            }}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-brand)] hover:opacity-90"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          aria-label="Закрыть"
          onClick={onDismiss}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
        >
          <X aria-hidden="true" size={16} strokeWidth={1.8} />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="progress-fill h-0.5 rounded-b"
        style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
      />
    </div>
  );
}
