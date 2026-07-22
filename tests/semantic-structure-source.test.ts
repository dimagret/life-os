import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('semantic SSR structure', () => {
  it('keeps public locale routes outside the authenticated data shell', () => {
    const localeLayout = read('src/app/[locale]/layout.tsx');
    const routeShell = read('src/components/AppRouteShell.tsx');

    expect(localeLayout).toContain('<AppRouteShell>{children}</AppRouteShell>');
    expect(localeLayout).not.toContain('<CloudDataProvider>');
    expect(routeShell).toContain("'login'");
    expect(routeShell).toContain("'register'");
    expect(routeShell).toContain("'legal'");
    expect(routeShell).toContain('parts.length === 1');
    expect(routeShell).toContain('<CloudDataProvider>');
    expect(routeShell).toContain('<LayoutShell>');
  });

  it('gives the login page server metadata and a server-provided return path', () => {
    const page = read('src/app/[locale]/login/page.tsx');
    const client = read('src/app/[locale]/login/LoginClient.tsx');

    expect(page).toContain('generateMetadata');
    expect(page).toContain("namespace: 'login'");
    expect(page).toContain('robots: { index: false, follow: false }');
    expect(page).toContain('requestedNextPath');
    expect(client).toContain('requestedNextPath');
    expect(client).not.toContain('useSearchParams');
    expect(client).toContain('role="alert"');
  });

  it('keeps the public login presentation dark without changing the user theme', () => {
    const client = read('src/app/[locale]/login/LoginClient.tsx');
    const globals = read('src/app/globals.css');

    expect(client).toContain('auth-surface-dark');
    expect(globals).toMatch(/:root\[data-theme="dark"\],\s*\.auth-surface-dark\s*\{/);
    expect(globals).toMatch(/\.auth-surface-dark\s*\{[\s\S]*?background:\s*var\(--app-bg\);/);
  });

  it('publishes locale landing pages without exposing authenticated application URLs', () => {
    const sitemap = read('src/app/sitemap.ts');

    expect(sitemap).toContain("{ path: '/', priority: 1.0 }");
    expect(sitemap).not.toContain("{ path: '/goals', priority: 0.8 }");
    expect(sitemap).not.toContain("{ path: '/action-court', priority: 0.8 }");
    expect(sitemap).toContain("{ path: '/legal/privacy'");
    expect(sitemap).not.toContain("`${SITE_URL}/en${path");
  });

  it('uses semantic headings, lists, articles, definitions, and dates in the daily dashboard', () => {
    const today = read('src/app/[locale]/TodayClient.tsx');
    const commandCenter = read('src/components/day/DayCommandCenter.tsx');
    const dailyPlan = read('src/components/day/DailyPlan.tsx');
    const taskCard = read('src/components/day/TaskCard.tsx');
    const metrics = read('src/components/today/TodayMetrics.tsx');

    expect(today).toContain('dateTime={todayStr}');
    expect(today).toContain('<h2 className={styles.secondaryTitle}>');
    expect(commandCenter).toContain('<h2 id="today-command-title"');
    expect(commandCenter).toContain('<dl className={styles.detailList}>');
    expect(dailyPlan).toContain('<ul className="space-y-3">');
    expect(taskCard).toContain('<article className="tactile-card p-4">');
    expect(taskCard).toContain('<h5 className="text-sm font-medium');
    expect(metrics).toContain('<dl className="status-metric-strip mt-4 grid grid-cols-3 gap-2">');
  });
});
