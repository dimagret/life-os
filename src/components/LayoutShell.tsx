'use client';

import { ReactNode, useEffect } from 'react';
import { useShell } from '@/lib/shell-context';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from './OfflineBanner';
import styles from './MidnightTheme.module.css';

export function LayoutShell({ children }: { children: ReactNode }) {
  const { hideShell } = useShell();

  useEffect(() => {
    if (hideShell) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [hideShell]);

  if (hideShell) {
    return (
      <div className={styles.theme}>
        <div className="min-h-screen">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.theme}>
      <OfflineBanner />
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
