import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const globals = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
const layout = readFileSync(resolve(root, 'src/app/[locale]/layout.tsx'), 'utf8');
const midnightTheme = readFileSync(resolve(root, 'src/components/MidnightTheme.module.css'), 'utf8');

describe('minimal light theme', () => {
  it('uses the same white canvas for explicit and system light themes', () => {
    expect(globals.match(/--bg-primary: #FFFFFF;/g)).toHaveLength(2);
    expect(globals.match(/--app-bg: #FFFFFF;/g)).toHaveLength(2);
    expect(globals.match(/--surface-panel: #FFFFFF;/g)).toHaveLength(2);
    expect(globals).not.toContain('#F4F1FF');
    expect(globals).not.toContain('#E9E2F7');
    expect(midnightTheme).toContain(':global(html[data-theme="light"]):has(.theme) .theme::before');
    expect(midnightTheme).toContain('display: none;');
  });

  it('keeps the browser chrome white in light mode', () => {
    expect(layout).toContain("{ media: '(prefers-color-scheme: light)', color: '#FFFFFF' }");
  });
});
