import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Supabase auth wiring', () => {
  it('uses a PKCE callback and keeps it public', () => {
    const registration = read('src/app/[locale]/register/RegistrationClient.tsx');
    const callback = read('src/app/auth/callback/route.ts');
    const proxy = read('src/proxy.ts');

    expect(registration).toContain('/auth/callback?next=');
    expect(callback).toContain('exchangeCodeForSession(code)');
    expect(callback).toContain('safeNextPath');
    expect(proxy).toContain("pathname === '/auth/callback'");
    expect(proxy).toMatch(
      /if \(request\.nextUrl\.pathname === '\/auth\/callback'\) \{\s*return NextResponse\.next\(\);\s*\}[\s\S]*?const baseResponse = intlMiddleware\(request\);/,
    );
  });

  it('never sends the password to Life OS persistence', () => {
    const registration = read('src/app/[locale]/register/RegistrationClient.tsx');
    const completion = read('src/lib/activationCompletion.ts');

    expect(registration).toContain('supabase.auth.signUp');
    expect(completion).not.toContain('password');
  });
});
