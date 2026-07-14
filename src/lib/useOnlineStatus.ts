'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks `navigator.onLine`. Returns `true` until the browser tells us
 * otherwise; we deliberately default to "online" to avoid scary banners
 * during SSR/hydration on a perfectly good connection.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let isActive = true;

    function syncInitial() {
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        if (isActive) setOnline(navigator.onLine);
      }
    }
    syncInitial();

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      isActive = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}
