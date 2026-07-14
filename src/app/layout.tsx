import "./globals.css";
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

/**
 * Root layout is intentionally a pass-through. The real root <html>/<body>
 * lives inside `app/[locale]/layout.tsx` so that `lang` and i18n provider
 * can be set per-locale (next-intl recommended pattern).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
