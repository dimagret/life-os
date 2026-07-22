import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublicConfig } from './config';

export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<{ authenticated: boolean; response: NextResponse }> {
  const config = getSupabasePublicConfig();
  if (!config) return { authenticated: false, response };

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  return {
    authenticated: !error && Boolean(data?.claims?.sub),
    response,
  };
}
