import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <div className="max-w-lg mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
