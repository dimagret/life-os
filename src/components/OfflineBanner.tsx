'use client';

import { useTranslations } from 'next-intl';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useTranslations('offline');
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-state="risk"
      className="fixed top-0 left-0 right-0 z-50 state-bg state-border-active border-b py-2 px-4 text-center"
    >
      <span className="text-xs font-medium state-text">{t('banner')}</span>
    </div>
  );
}
