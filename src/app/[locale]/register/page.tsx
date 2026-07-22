import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { RegistrationClient } from './RegistrationClient';

const COPY = {
  ru: { title: 'Регистрация в Life OS', description: 'Создайте аккаунт Life OS и настройте личную систему дисциплины.' },
  en: { title: 'Create a Life OS account', description: 'Create a Life OS account and configure your personal discipline system.' },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale];
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${locale}/register`,
      languages: { ru: '/ru/register', en: '/en/register' },
    },
  };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RegistrationClient />;
}
