import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Action Court command layout', () => {
  it('uses the same command-card hierarchy as Today', () => {
    const component = read('src/components/court/ActionCourt.tsx');
    const css = read('src/components/court/ActionCourt.module.css');

    expect(component).toContain("import styles from './ActionCourt.module.css'");
    expect(component).toContain('className={styles.reviewCard}');
    expect(component).toContain('className={styles.progressTrack}');
    expect(component).toContain('className={styles.taskRow}');
    expect(component).toContain('className={styles.primaryAction}');
    expect(component).not.toContain('border-transparent opacity-60');

    expect(css).toContain('border: 1px solid var(--state-border)');
    expect(css).toContain('border-radius: 16px');
    expect(css).toContain('var(--state-soft)');
    expect(css).toContain('background: var(--state-color)');
    expect(css).toContain('background: var(--surface-card)');
  });

  it('keeps semantic status controls and accessible progress', () => {
    const component = read('src/components/court/ActionCourt.tsx');

    expect(component).toContain('role="progressbar"');
    expect(component).toContain('aria-valuenow={1}');
    expect(component).toContain('role="radiogroup"');
    expect(component).toContain('role="radio"');
    expect(component).toContain('data-selection-tone={opt.value}');
  });
});
