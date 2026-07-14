import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { AUTH_COOKIE_NAME, getAuthConfig, verifyAuthSessionCookie } from './lib/auth';

const intlMiddleware = createMiddleware(routing);
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const localeSet = new Set<string>(routing.locales);

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

function getConfiguredPublicOrigin(): string | null {
  if (!configuredSiteUrl) return null;

  try {
    const url = new URL(configuredSiteUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (shouldUsePublicOrigin(url)) return null;

    return url.origin;
  } catch {
    return null;
  }
}

function getPublicOrigin(request: NextRequest): string | null {
  const configuredOrigin = getConfiguredPublicOrigin();
  if (configuredOrigin) return configuredOrigin;

  const host = firstHeaderValue(request.headers.get('x-forwarded-host')) ?? firstHeaderValue(request.headers.get('host'));
  if (!host) return null;

  const proto =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ?? request.nextUrl.protocol.replace(':', '') ?? 'https';

  const port = firstHeaderValue(request.headers.get('x-forwarded-port'));

  try {
    const url = new URL(`${proto}://${host}`);
    if ((url.protocol === 'https:' && port === '443') || (url.protocol === 'http:' && port === '80')) {
      url.port = '';
    }

    return url.origin;
  } catch {
    return `${proto}://${host}`;
  }
}

function shouldUsePublicOrigin(url: URL): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname) || url.port === '3000';
}

function normalizeAbsoluteHeader(response: Response, request: NextRequest, headerName: string) {
  const value = response.headers.get(headerName);
  const publicOrigin = getPublicOrigin(request);
  if (!value || !publicOrigin) return;

  try {
    const url = new URL(value);
    const publicUrl = new URL(publicOrigin);
    const hasPublicHostWithInternalPort = url.hostname === publicUrl.hostname && url.port !== publicUrl.port;
    if (!shouldUsePublicOrigin(url) && !hasPublicHostWithInternalPort) return;

    url.protocol = publicUrl.protocol;
    url.host = publicUrl.host;
    response.headers.set(headerName, url.toString());
  } catch {
    // Relative headers are fine and must stay relative.
  }
}

function getPathLocale(pathname: string): string {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return firstSegment && localeSet.has(firstSegment) ? firstSegment : routing.defaultLocale;
}

function isLoginPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 2 && localeSet.has(parts[0]) && parts[1] === 'login';
}

function buildLoginRedirect(request: NextRequest): NextResponse {
  const locale = getPathLocale(request.nextUrl.pathname);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/login`;
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (!isLoginPath(request.nextUrl.pathname) && nextPath !== `/${locale}/login`) {
    url.searchParams.set('next', nextPath);
  }
  return NextResponse.redirect(url);
}

export default async function middleware(request: NextRequest) {
  const authConfig = getAuthConfig();
  const loginPath = isLoginPath(request.nextUrl.pathname);

  if (authConfig.mode === 'disabled' && loginPath) {
    const url = request.nextUrl.clone();
    url.pathname = `/${getPathLocale(request.nextUrl.pathname)}`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (authConfig.mode !== 'disabled') {
    const authenticated =
      authConfig.mode === 'ready' &&
      (await verifyAuthSessionCookie(request.cookies.get(AUTH_COOKIE_NAME)?.value));

    if (!authenticated && !loginPath) {
      return buildLoginRedirect(request);
    }

    if (authenticated && loginPath) {
      const url = request.nextUrl.clone();
      url.pathname = `/${getPathLocale(request.nextUrl.pathname)}`;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  const response = intlMiddleware(request);

  normalizeAbsoluteHeader(response, request, 'location');
  normalizeAbsoluteHeader(response, request, 'x-middleware-rewrite');

  return response;
}

export const config = {
  // Match every path except API routes, Next assets, manifest/icon/og/robots/sitemap.
  matcher: [
    '/((?!api|_next|_vercel|manifest.webmanifest|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image|favicon.ico|.*\\..*).*)',
  ],
};
