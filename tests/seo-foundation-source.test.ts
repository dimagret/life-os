import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('public SEO foundation', () => {
  it('serves a public landing page at locale roots while preserving the signed-in dashboard', () => {
    const page = read('src/app/[locale]/page.tsx');
    const proxy = read('src/proxy.ts');

    expect(page).toContain('generateMetadata');
    expect(page).toContain("export const dynamic = 'force-dynamic'");
    expect(page).toContain('<PublicLanding locale={locale} />');
    expect(page).toContain('<TodayClient />');
    expect(page).toContain('createSupabaseServerClient');
    expect(proxy).toContain('function isLocaleRootPath');
    expect(proxy).toContain('isLocaleRootPath(pathname)');
  });

  it('renders one landing H1, crawlable product copy, CTAs, and factual structured data', () => {
    const landing = read('src/components/marketing/PublicLanding.tsx');

    expect((landing.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(landing).toContain('SoftwareApplication');
    expect(landing).toContain('FAQPage');
    expect(landing).toContain('applicationCategory');
    expect(landing).toContain('href={`/${locale}/register`}');
    expect(landing).toContain('href={`/${locale}/login`}');
  });

  it('uses route-specific canonical, hreflang, and robots metadata', () => {
    const landingPage = read('src/app/[locale]/page.tsx');
    const registrationPage = read('src/app/[locale]/register/page.tsx');
    const legalPage = read('src/app/[locale]/legal/[document]/page.tsx');

    expect(landingPage).toContain("canonical: `/${locale}`");
    expect(landingPage).toContain("languages: { ru: '/ru', en: '/en' }");
    expect(registrationPage).toContain("canonical: `/${locale}/register`");
    expect(registrationPage).toContain("robots: { index: false, follow: true }");
    expect(legalPage).toContain("canonical: locale === 'ru' ? canonicalPath : `/ru/legal/${document}`");
    expect(legalPage).toContain("robots: { index: locale === 'ru', follow: true }");
  });

  it('redirects the www host permanently to the canonical apex host', () => {
    const nginx = read('deploy/nginx.conf');

    expect(nginx).toContain('server_name www.your-domain.com;');
    expect(nginx).toContain('return 301 https://your-domain.com$request_uri;');
    expect(nginx).toContain('server_name your-domain.com;');
  });
});
