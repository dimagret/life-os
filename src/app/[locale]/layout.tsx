import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { NetworkBanner } from '@/components/NetworkBanner';
import { LayoutShell } from '@/components/LayoutShell';
import { DebugErrorBoundary } from '@/components/DebugErrorBoundary';
import { ShellProvider } from '@/lib/shell-context';
import { ANTI_FOUC_SCRIPT } from '@/lib/useTheme';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('siteTitle'),
      template: '%s · Life OS',
    },
    description: t('siteDescription'),
    applicationName: 'Life OS',
    keywords: ['life os', 'продуктивность', 'goals', 'focus', 'day review'],
    authors: [{ name: 'Life OS' }],
    formatDetection: { email: false, address: false, telephone: false },
    openGraph: {
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'ru_RU',
      alternateLocale: locale === 'en' ? ['ru_RU'] : ['en_US'],
      siteName: 'Life OS',
      title: t('siteTitle'),
      description: t('siteDescription'),
      url: `${SITE_URL}/${locale}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('siteTitle'),
      description: t('siteDescription'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    alternates: {
      canonical: `/${locale}`,
      languages: { ru: '/ru', en: '/en' },
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07070C' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
  viewportFit: 'cover',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="min-h-[100dvh] antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
      </head>
      <body
        className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]"
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ShellProvider>
            <CapacitorBridge />
            <NetworkBanner />
            <DebugErrorBoundary>
              <LayoutShell>
                {children}
              </LayoutShell>
            </DebugErrorBoundary>
          </ShellProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
