import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('personal data compliance source contract', () => {
  it('publishes the operator details and all legal documents', () => {
    const legal = read('src/lib/legal.ts');
    const page = read('src/app/[locale]/legal/[document]/page.tsx');

    expect(legal).toContain('Гретченко Дмитрий Ростиславович');
    expect(legal).toContain('г. Мариуполь, проспект Ильича, дом 52');
    expect(legal).toContain('dimagret1997@yandex.com');
    expect(page).toContain('Central EU (Frankfurt)');
    expect(page).toContain('Политика использования cookies');
  });

  it('requires separate consent without collecting age data', () => {
    const activation = read('src/components/activation/ActivationPrototype.tsx');
    const registration = read('src/app/[locale]/register/RegistrationClient.tsx');
    const page = read('src/app/[locale]/legal/[document]/page.tsx');
    const css = read('src/components/activation/ActivationPrototype.module.css');

    expect(activation).toContain('lifeos-privacy-consent');
    expect(activation).not.toContain('ageGroup');
    expect(activation).not.toContain('lifeos-guardian-consent');
    expect(activation).toContain('/legal/consent');
    expect(activation).toMatch(/\/legal\/consent[\s\S]*\/legal\/privacy[\s\S]*\/legal\/cookies/);
    expect(activation).not.toContain('styles.legalLinks');
    expect(css).toMatch(/\.registrationSubmit\s*\{[^}]*margin-top: -7px;/);
    expect(registration).toContain('personal_data_consent_version: LEGAL_DOCUMENT_VERSION');
    expect(registration).toContain('personal_data_consent_at: consentAt');
    expect(registration).not.toContain('age_group:');
    expect(registration).not.toContain('guardian_consent_confirmed:');
    expect(page).not.toMatch(/16.?17/);
    expect(registration).not.toContain('password,\n          personal_data_consent');
  });

  it('keeps legal routes public and linked from authentication', () => {
    const proxy = read('src/proxy.ts');
    const login = read('src/app/[locale]/login/LoginClient.tsx');

    expect(proxy).toContain('isLegalPath(pathname)');
    expect(login).toContain('/legal/privacy');
    expect(login).toContain('/legal/consent');
    expect(login).toContain('/legal/cookies');
  });
});
