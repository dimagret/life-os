import { setRequestLocale } from 'next-intl/server';
import { LoginClient } from './LoginClient';
import type { Locale } from '@/i18n/routing';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginClient />;
}
