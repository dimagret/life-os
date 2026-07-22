'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { CloudDataProvider } from '@/components/CloudDataProvider';
import { DebugErrorBoundary } from '@/components/DebugErrorBoundary';
import { LayoutShell } from '@/components/LayoutShell';
import { NetworkBanner } from '@/components/NetworkBanner';

const PUBLIC_ROUTE_SEGMENTS = new Set(['login', 'register', 'legal', 'activation-prototype']);

function isPublicLocaleRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 1 || Boolean(parts[1] && PUBLIC_ROUTE_SEGMENTS.has(parts[1]));
}

export function AuthenticatedRouteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <CapacitorBridge />
      <NetworkBanner />
      <DebugErrorBoundary>
        <CloudDataProvider>
          <LayoutShell>{children}</LayoutShell>
        </CloudDataProvider>
      </DebugErrorBoundary>
    </>
  );
}

export function AppRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';

  if (isPublicLocaleRoute(pathname)) return children;

  return <AuthenticatedRouteShell>{children}</AuthenticatedRouteShell>;
}
