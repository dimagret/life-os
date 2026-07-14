'use client';

import type { BackButtonListenerEvent } from '@capacitor/app';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Same-origin deep links + custom schemes whose path looks like this SPA (localePrefix as-needed). */
function isAllowedAppUrlOpen(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const path = `${u.pathname}${u.search}${u.hash}`;
  const scheme = u.protocol.replace(':', '').toLowerCase();
  const siteRaw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  const isLikelyAppPath = (pathname: string) => {
    if (pathname === '/' || pathname === '') return true;
    if (pathname === '/en' || pathname.startsWith('/en/')) return true;
    const top = pathname.split('/').filter(Boolean)[0];
    return ['profile', 'goals', 'codex', 'action-court'].includes(top ?? '');
  };

  if (siteRaw) {
    try {
      const site = new URL(siteRaw);
      const allowedHost = site.hostname.toLowerCase();

      if (scheme === 'http' || scheme === 'https') {
        if (u.hostname.toLowerCase() !== allowedHost) return null;
        return path;
      }

      if (!isLikelyAppPath(u.pathname)) return null;
      return path;
    } catch {
      return null;
    }
  }

  // Without NEXT_PUBLIC_SITE_URL we cannot trust http(s) origins — reject them.
  // Allow only non-web schemes whose pathname matches known in-app routes (same as above).
  if (scheme === 'http' || scheme === 'https') return null;
  if (!isLikelyAppPath(u.pathname)) return null;
  return path;
}

/**
 * Splash, статус-бар, системная кнопка «Назад», deep links (appUrlOpen).
 */
export function CapacitorBridge() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    type Handle = { remove: () => Promise<void> };
    const listenersPromise = (async (): Promise<Handle[]> => {
      const { Capacitor } = await import('@capacitor/core');
      if (disposed || !Capacitor.isNativePlatform()) return [];

      const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
        import('@capacitor/splash-screen'),
        import('@capacitor/status-bar'),
        import('@capacitor/app'),
      ]);

      await SplashScreen.hide().catch(() => {});
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      const back = await App.addListener('backButton', (event: BackButtonListenerEvent) => {
        if (event.canGoBack) {
          router.back();
        } else {
          void App.minimizeApp().catch(() => {});
        }
      });

      const urlOpen = await App.addListener('appUrlOpen', ({ url }) => {
        const path = isAllowedAppUrlOpen(url);
        if (path) router.push(path);
      });

      return [back, urlOpen];
    })();

    return () => {
      disposed = true;
      void listenersPromise.then((handles) => {
        handles.forEach((h) => void h.remove());
      });
    };
  }, [router]);

  return null;
}
