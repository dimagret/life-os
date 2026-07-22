import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginClient } from './LoginClient';
import type { Locale } from '@/i18n/routing';

type LoginSearchParams = {
  next?: string | string[];
  reset?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });

  return {
    title: t('title'),
    description: t('subtitle'),
    robots: { index: false, follow: false },
    alternates: { canonical: `/${locale}/login` },
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<LoginSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const requestedNextPath = typeof query.next === 'string' ? query.next : null;
  const passwordResetSucceeded = query.reset === 'success';

  return <LoginClient requestedNextPath={requestedNextPath} passwordResetSucceeded={passwordResetSucceeded} />;
}
