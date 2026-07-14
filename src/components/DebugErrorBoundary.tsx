'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

/** Ловит ошибки рендера в оболочке и показывает сообщение вместо белого экрана. */
export class DebugErrorBoundary extends Component<Props, { error: Error | null }> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Life OS] LayoutShell render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen p-6 max-w-lg mx-auto">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Ошибка отрисовки</h1>
          <pre className="text-xs whitespace-pre-wrap break-words p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--state-deception)]">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
