'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * Баннер «нет сети» только на клиенте; не ломает SSR.
 * Нативно: @capacitor/network; в браузере — navigator.onLine + события online/offline.
 */
export function NetworkBanner() {
  const t = useTranslations('common');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let disposed = false;

    const apply = (connected: boolean) => {
      if (!disposed) setOffline(!connected);
    };

    apply(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const onBrowser = () => apply(navigator.onLine);
    window.addEventListener('online', onBrowser);
    window.addEventListener('offline', onBrowser);

    let removeCapListener: (() => void) | undefined;

    void (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (disposed || !Capacitor.isNativePlatform()) return;

      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      apply(status.connected);

      const handle = await Network.addListener('networkStatusChange', (s) => apply(s.connected));
      removeCapListener = () => void handle.remove();
    })();

    return () => {
      disposed = true;
      window.removeEventListener('online', onBrowser);
      window.removeEventListener('offline', onBrowser);
      removeCapListener?.();
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] border-b border-[var(--state-risk-border)] bg-[var(--state-risk-soft)] px-4 py-2 text-center text-sm text-[var(--text-primary)]"
    >
      {t('offlineBanner')}
    </div>
  );
}
