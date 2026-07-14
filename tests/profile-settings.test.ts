import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const profileSource = readFileSync(
  resolve(root, 'src/app/[locale]/profile/ProfileClient.tsx'),
  'utf8',
);
const ru = JSON.parse(readFileSync(resolve(root, 'messages/ru.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(root, 'messages/en.json'), 'utf8'));

describe('profile settings information architecture', () => {
  it('keeps all user-facing groups and the heading hierarchy in the profile screen', () => {
    expect(profileSource).toContain('<h1');
    for (const headingId of [
      'account-mode-heading',
      'progress-heading',
      'ai-data-heading',
      'appearance-heading',
      'focus-sound-heading',
      'reminders-heading',
      'danger-heading',
    ]) {
      expect(profileSource).toContain(`<h2 id="${headingId}"`);
    }
  });

  it('requires explicit consent before hard or owner mode is saved', () => {
    expect(profileSource).toContain("pendingStrictness === 'hard' || pendingStrictness === 'owner'");
    expect(profileSource).toContain('strictnessExplicitConsent');
    expect(profileSource).toContain('disabled={strictnessNeedsAcknowledgement && !strictnessAcknowledged}');
    expect(profileSource).toContain('role="radiogroup"');
    expect(profileSource).toContain('role="radio"');
    expect(profileSource).toContain('aria-checked={checked}');
  });

  it('keeps development demo tools out of the production render path', () => {
    expect(profileSource).toContain("process.env.NODE_ENV !== 'production'");
    expect(profileSource).toContain('onClick={handleFillDemo}');
    expect(profileSource.indexOf("process.env.NODE_ENV !== 'production'"))
      .toBeLessThan(profileSource.indexOf('onClick={handleFillDemo}'));
  });

  it('keeps Russian and English profile keys aligned and avoids an exact AI cost claim', () => {
    expect(Object.keys(ru.profile).sort()).toEqual(Object.keys(en.profile).sort());
    expect(ru.profile.costHint).not.toMatch(/\$|\d+[.,]\d+/);
    expect(en.profile.costHint).not.toMatch(/\$|\d+[.,]\d+/);
  });
});
