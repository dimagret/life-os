import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('registration and activation flow', () => {
  it('keeps registration separate and opens activation only after the confirmation callback', () => {
    const prototype = read('src/components/activation/ActivationPrototype.tsx');
    const registration = read('src/app/[locale]/register/RegistrationClient.tsx');
    const today = read('src/app/[locale]/TodayClient.tsx');
    const authenticatedActivation = read('src/components/activation/AuthenticatedActivation.tsx');
    const css = read('src/components/activation/ActivationPrototype.module.css');

    expect(prototype).toContain("if (production && step === 'entry')");
    expect(prototype).toContain('styles.registrationViewport');
    expect(prototype).toContain('styles.registrationWorkspace');
    expect(prototype).toContain("const journeySteps = production && startAt !== 'entry'");
    expect(prototype).toContain('t.stepNames[STEPS.indexOf(step)]');
    expect(css).toContain('.registrationViewport');
    expect(css).toContain('.registrationEntry .heroCopy');
    expect(prototype).toContain("href={`/${rawLocale}/login`}");
    expect(prototype).toContain('<p className={styles.loginPrompt}>');
    expect(prototype).toContain('className={styles.loginLink}');
    expect(prototype).toContain("{isRu ? 'Уже есть аккаунт?' : 'Already have an account?'}{' '}");
    expect(prototype).toContain("{isRu ? 'Войти' : 'Sign in'}");
    expect(css).toContain('.loginPrompt');
    expect(css).toContain('.loginLink');
    expect(registration).toContain('/auth/callback?next=/${locale}');
    expect(today).toContain('if (showOnboarding)');
    expect(today).toContain('return <AuthenticatedActivation />');
    expect(authenticatedActivation).toContain('startAt="commitment"');
  });
});
