import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const globalsCss = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const focusBlock = fs.readFileSync(path.join(root, 'src/components/day/FocusBlock.tsx'), 'utf8');

describe('focus session layout', () => {
  it('keeps the context card aligned to the full width of the detail card', () => {
    const contextCardRule = globalsCss.match(/\.focus-context-card\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(contextCardRule).toMatch(/width:\s*100%\s*;/);
    expect(contextCardRule).not.toContain('24rem');
  });

  it('uses the selected state color throughout the focus controls and timer', () => {
    const focusVisualCss = globalsCss.slice(
      globalsCss.indexOf('  .focus-visual-stage {'),
      globalsCss.indexOf('  .focus-secondary-button {'),
    );
    const timerRingSource = focusBlock.slice(
      focusBlock.indexOf('function TimerRing'),
      focusBlock.indexOf('function FocusWaveform'),
    );

    expect(focusVisualCss).toContain('var(--state-color)');
    expect(focusVisualCss).not.toMatch(/var\(--(?:signal-cyan|signal-blue|accent-brand)\)/);
    expect(timerRingSource).toContain('var(--state-color)');
    expect(timerRingSource).not.toMatch(/var\(--(?:signal-cyan|signal-blue|accent-brand)\)/);
  });
  it('keeps preset buttons equal across mobile breakpoints', () => {
    expect(focusBlock).toContain('className="focus-preset-grid mb-3"');
    expect(globalsCss).toMatch(
      /\.focus-preset-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s,
    );
    expect(globalsCss).toMatch(
      /@media\s*\(max-width:\s*360px\)[\s\S]*?\.focus-preset-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(globalsCss).toMatch(
      /\.focus-preset-button\s*\{[^}]*width:\s*100%;[^}]*font-size:\s*0\.875rem;/s,
    );
  });
  it('keeps only the shell padding beside the idle start button', () => {
    const startButton = focusBlock.match(
      /onClick=\{startFocus\}[\s\S]*?className="([^"]+)"/,
    )?.[1] ?? '';

    expect(startButton).toContain('w-full');
    expect(startButton).not.toContain('max-w-sm');
  });
});
