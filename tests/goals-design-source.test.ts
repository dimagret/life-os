import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const goalsClient = fs.readFileSync(
  path.join(root, 'src/app/[locale]/goals/GoalsClient.tsx'),
  'utf8'
);
const goalCard = fs.readFileSync(
  path.join(root, 'src/components/goals/GoalCard.tsx'),
  'utf8'
);
const goalsCss = fs.readFileSync(
  path.join(root, 'src/app/[locale]/goals/Goals.module.css'),
  'utf8'
);
const goalCardCss = fs.readFileSync(
  path.join(root, 'src/components/goals/GoalCard.module.css'),
  'utf8'
);

describe('goals unified design system', () => {
  it('uses the shared state surface tokens for the page and goal card', () => {
    expect(goalsClient).toContain("import styles from './Goals.module.css'");
    expect(goalCard).toContain("import styles from './GoalCard.module.css'");
    expect(goalsCss).toContain('var(--surface-card)');
    expect(goalCardCss).toContain('var(--state-border)');
    expect(goalCardCss).toContain('var(--state-color)');
  });

  it('keeps the goal CTA inside the command surface with accessible focus styling', () => {
    expect(goalCard).toContain('styles.primaryAction');
    expect(goalCard).toContain('aria-hidden="true"');
    expect(goalCardCss).toContain('.primaryAction:focus-visible');
  });
});
