import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null): string {
  if (!value || !/^\/(ru|en)(\/|$)/.test(value) || value.startsWith('//')) return '/ru';
  return value;
}

function getPublicOrigin(request: NextRequest): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    try {
      const url = new URL(configuredSiteUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
    } catch {
      // Fall back to the request origin when the configured URL is invalid.
    }
  }

  return request.nextUrl.origin;
}

function redirectToPublicPath(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, getPublicOrigin(request)));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextPath = safeNextPath(request.nextUrl.searchParams.get('next'));
  const supabase = await createSupabaseServerClient();

  if (!supabase || !code) {
    return redirectToPublicPath(request, '/ru/login?error=confirmation');
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToPublicPath(request, '/ru/login?error=confirmation');
  }

  return redirectToPublicPath(request, nextPath);
}
