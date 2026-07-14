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

describe('profile current-state indicator', () => {
  it('uses the same shell state as the Today state switcher', () => {
    expect(profileClient).toContain('const { currentState } = useShell()');
    expect(profileClient).toContain('data-state={currentState}');
    expect(profileClient).toContain('tState(currentState)');
    expect(profileClient).not.toContain('const profileState:');
  });

  it('derives the marker, label, border and background from state tokens', () => {
    expect(profileCss).toContain('background: var(--state-color)');
    expect(profileCss).toContain('color: var(--state-color)');
    expect(profileCss).toContain('border-color: var(--state-border)');
    expect(profileCss).toContain('var(--state-soft)');
  });
});
