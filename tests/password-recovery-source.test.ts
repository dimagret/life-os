import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const exists = (path: string) => existsSync(resolve(root, path));

describe('Supabase password recovery flow', () => {
  it('exposes a public recovery request from the sign-in interface', () => {
    const forgotClientPath = 'src/app/[locale]/forgot-password/ForgotPasswordClient.tsx';

    expect(exists(forgotClientPath)).toBe(true);

    const login = read('src/app/[locale]/login/LoginClient.tsx');
    const forgot = read(forgotClientPath);
    const proxy = read('src/proxy.ts');

    expect(login).toContain('/forgot-password');
    expect(forgot).toContain('supabase.auth.resetPasswordForEmail');
    expect(forgot).toContain('/auth/callback?next=/${locale}/reset-password');
    expect(proxy).toContain('isForgotPasswordPath');
  });

  it('updates a password only from the authenticated recovery screen', () => {
    const resetClientPath = 'src/app/[locale]/reset-password/ResetPasswordClient.tsx';

    expect(exists(resetClientPath)).toBe(true);

    const reset = read(resetClientPath);
    const proxy = read('src/proxy.ts');

    expect(reset).toContain('supabase.auth.getUser');
    expect(reset).toContain('supabase.auth.updateUser');
    expect(reset).toContain('supabase.auth.signOut');
    expect(proxy).not.toContain("isResetPasswordPath(pathname)");
  });
});
