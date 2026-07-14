import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('unified Midnight Command selection and surface system', () => {
  it('uses current state tokens for the primary action and selected controls', () => {
    const css = read('src/components/MidnightTheme.module.css');
    const globalCss = read('src/app/globals.css');

    expect(css).toContain('.theme :global(.tactile-button-primary)');
    expect(css).toContain('background: var(--state-color)');
    expect(css).toContain('.theme :global(.selection-control)');
    expect(css).toContain('.selection-control[aria-checked="true"]');
    expect(css).toContain('.selection-control[aria-pressed="true"]');
    expect(css).toContain('data-selection-tone="completed"');
    expect(css).toContain('data-selection-tone="partial"');
    expect(css).toContain('data-selection-tone="failed"');
    expect(globalCss).toMatch(/\.focus-icon-tile \{[\s\S]*?border: 1px solid var\(--state-border\)[\s\S]*?color: var\(--state-color\)[\s\S]*?linear-gradient\(145deg, var\(--state-soft\), transparent\)/);
  });

  it('keeps resting interactive surfaces white in light mode', () => {
    const themeCss = read('src/components/MidnightTheme.module.css');
    const todayCss = read('src/app/[locale]/Today.module.css');
    const commandCss = read('src/components/day/DayCommandCenter.module.css');

    expect(themeCss).toMatch(/\.selection-control\)[\s\S]*?background: var\(--surface-card\)/);
    expect(themeCss).toMatch(/:global\(details\)[\s\S]*?background: var\(--surface-card\)/);
    expect(todayCss).toMatch(/\.today-task-details\)[\s\S]*?background: var\(--surface-card\)/);
    expect(todayCss).toMatch(/\.secondaryDetails[\s\S]*?background: var\(--surface-card\)/);
    expect(commandCss).toMatch(/\.stepRow \{[\s\S]*?background: var\(--surface-card\)/);
  });

  it('applies the shared selection control to repeated product choices', () => {
    const sources = [
      'src/components/court/ActionCourt.tsx',
      'src/components/court/FailureReview.tsx',
      'src/components/goals/GoalBuilder.tsx',
      'src/components/goals/GoalAnalysisCard.tsx',
      'src/app/[locale]/profile/ProfileClient.tsx',
      'src/components/ui/ThemeToggle.tsx',
      'src/components/ui/LocaleToggle.tsx',
      'src/components/day/FocusBlock.tsx',
    ].map(read);

    for (const source of sources) expect(source).toContain('selection-control');
    expect(sources[0]).not.toContain('border-transparent opacity-60');
    expect(sources[0]).not.toContain("'var(--bg-hover)'");
    expect(sources[1]).not.toContain('data-selection-tone="risk"');
    expect(sources[1]).toContain("'var(--selection-color)'");
  });

  it('keeps the primary workflow readable and semantically headed', () => {
    const themeCss = read('src/components/MidnightTheme.module.css');
    const todayCss = read('src/app/[locale]/Today.module.css');
    const courtCss = read('src/components/court/ActionCourt.module.css');
    const focusSource = read('src/components/day/FocusBlock.tsx');
    const verdictSource = read('src/components/court/VerdictScreen.tsx');
    const verdictCss = read('src/components/court/VerdictScreen.module.css');

    expect(themeCss).toContain('max-width: 44rem');
    expect(todayCss).toContain('max-width: 44rem');
    expect(courtCss).toContain('min-height: 44px');
    expect(courtCss).not.toContain('font-size: 9px');
    expect(focusSource).toContain('<h1 className="text-base font-semibold leading-snug text-[var(--text-primary)]">{taskTitleDisplay}</h1>');
    expect(focusSource).toContain('className="focus-orbit-ring"');
    expect(focusSource).toContain('const orbitR = 97;');
    expect(focusSource).toContain('const innerR = 82;');
    expect(focusSource).toContain('id="focusOrbitArcGlow"');
    expect(focusSource).toContain("paused ? 'opacity-0' : 'opacity-55'");
    expect(focusSource).toContain('focus-control-panel');
    expect(focusSource).toContain('focus-more-actions');
    expect(verdictSource).toContain('styles.summaryCard');
    expect(verdictSource).toContain('<details className={styles.taskSummary}');
    expect(verdictSource).toContain('styles.recoveryCard');
    expect(verdictCss).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
  });
});
