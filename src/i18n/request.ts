import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import enMessages from '../../messages/en.json';
import ruMessages from '../../messages/ru.json';
import { routing } from './routing';
import type { Locale } from './routing';

const messagesByLocale = {
  en: enMessages,
  ru: ruMessages,
} satisfies Record<Locale, unknown>;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
