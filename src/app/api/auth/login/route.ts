import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_MAX_AGE_SECONDS,
  createAuthSessionCookie,
  getAuthConfig,
  verifyAuthCredentials,
} from '@/lib/auth';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const authConfig = getAuthConfig();
  if (authConfig.mode === 'disabled') {
    return NextResponse.json({ ok: false, error: 'auth_disabled' }, { status: 404 });
  }
  if (authConfig.mode === 'misconfigured') {
    return NextResponse.json(
      { ok: false, error: 'auth_misconfigured', missing: authConfig.missing },
      { status: 500 },
    );
  }

  const ip = getClientIp({ headers: request.headers });
  const limited = await rateLimit(`auth:${ip}`);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((limited.reset - Date.now()) / 1000))),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const username = typeof (body as { username?: unknown }).username === 'string'
    ? (body as { username: string }).username
    : '';
  const password = typeof (body as { password?: unknown }).password === 'string'
    ? (body as { password: string }).password
    : '';

  if (!verifyAuthCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: await createAuthSessionCookie(username.trim()),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  return response;
}
