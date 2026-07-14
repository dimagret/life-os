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

describe('profile dangerous-actions state styling', () => {
  it('binds the section to the shared current state', () => {
    expect(profileClient).toMatch(
      /aria-labelledby="danger-heading"[\s\S]*data-state=\{currentState\}/
    );
    expect(profileClient).toContain('styles.dangerSection');
    expect(profileClient).toContain('styles.dangerTrigger');
  });

  it('uses current-state tokens instead of a fixed risk palette', () => {
    expect(profileCss).toMatch(
      /section\[aria-labelledby="danger-heading"\][\s\S]*var\(--state-border\)/
    );
    expect(profileCss).toMatch(/\.dangerTitle[\s\S]*var\(--state-color\)/);
    expect(profileCss).toMatch(/\.dangerTrigger[\s\S]*var\(--state-border\)/);
    expect(profileCss).toMatch(/\.dangerTrigger:hover[\s\S]*var\(--state-soft\)/);
  });
});
