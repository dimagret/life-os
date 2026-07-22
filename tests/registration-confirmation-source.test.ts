import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('registration email confirmation flow', () => {
  it('shows a confirmation state instead of treating account creation as an error', () => {
    const registration = read('src/app/[locale]/register/RegistrationClient.tsx');
    const prototype = read('src/components/activation/ActivationPrototype.tsx');

    expect(registration).toContain("status: 'confirmation-required'");
    expect(prototype).toContain("registration.status === 'confirmation-required'");
    expect(prototype).toContain('setAwaitingEmailConfirmation(true)');
    expect(prototype).toContain("setPassword('')");
    expect(prototype).toContain('role="status"');
  });

  it('maps actionable Supabase signup errors', () => {
    const registration = read('src/app/[locale]/register/RegistrationClient.tsx');

    expect(registration).toContain("case 'over_email_send_rate_limit'");
    expect(registration).toContain("case 'weak_password'");
    expect(registration).toContain("case 'email_address_invalid'");
    expect(registration).toContain("case 'email_address_not_authorized'");
  });
});
