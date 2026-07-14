import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  // Keep locale prefixes explicit in production. With standalone Next.js behind
  // nginx, the default-locale rewrite from `/` to `/ru` can leak internal ports.
  localePrefix: 'always',
  // Disable Accept-Language negotiation. Without this, a browser that asks
  // for `en-US` would get redirected from `/` to `/en` automatically — which
  // breaks "RU is the default" promise. Locale switching is explicit via
  // the toggle in /profile.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
