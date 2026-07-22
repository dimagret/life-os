import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { ActivationPrototype } from '@/components/activation/ActivationPrototype';

export const metadata: Metadata = {
  title: 'Прототип активации',
  description: 'Интерактивный прототип первого пути пользователя Life OS.',
  robots: { index: false, follow: false },
};

export default async function ActivationPrototypePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ActivationPrototype />;
}
