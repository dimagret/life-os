import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { AuthenticatedRouteShell } from '@/components/AppRouteShell';
import { PublicLanding } from '@/components/marketing/PublicLanding';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import TodayClient from './TodayClient';

export const dynamic = 'force-dynamic';

const METADATA = {
  ru: {
    title: 'Life OS — система личной дисциплины и фокуса',
    description: 'Свяжите цели с ежедневными действиями: планируйте день, работайте в фокусе, разбирайте результат и корректируйте нагрузку.',
  },
  en: {
    title: 'Life OS — a personal discipline and focus system',
    description: 'Connect goals with daily actions: plan your day, work in focus, review the result, and adjust your workload.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const copy = METADATA[locale];
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    alternates: { canonical: `/${locale}`, languages: { ru: '/ru', en: '/en' } },
    openGraph: {
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
      title: copy.title,
      description: copy.description,
      url: `/${locale}`,
    },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description },
  };
}

export default async function TodayPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  let authenticated = false;

  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.auth.getClaims();
      authenticated = Boolean(data?.claims?.sub);
    }
  } catch {
    authenticated = false;
  }

  if (!authenticated) return <PublicLanding locale={locale} />;
  return <AuthenticatedRouteShell><TodayClient /></AuthenticatedRouteShell>;
}
