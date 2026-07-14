import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profileClient = fs.readFileSync(
  path.join(root, 'src/app/[locale]/profile/ProfileClient.tsx'),
  'utf8'
);
const profileCss = fs.readFileSync(
  path.join(root, 'src/app/[locale]/profile/Profile.module.css'),
  'utf8'
);

describe('profile unified design system', () => {
  it('uses the shared command-surface tokens and hierarchy', () => {
    expect(profileClient).toContain("import styles from './Profile.module.css'");
    expect(profileClient).toContain('styles.pageHeader');
    expect(profileClient).toContain('styles.profile');
    expect(profileCss).toContain('var(--surface-card)');
    expect(profileCss).toContain('var(--state-border)');
    expect(profileCss).toContain('border-radius: 16px');
  });

  it('keeps explicit accessible selected and focus states', () => {
    expect(profileCss).toContain('.selection-control[aria-checked="true"]');
    expect(profileCss).toContain(':focus-visible');
  });
});
