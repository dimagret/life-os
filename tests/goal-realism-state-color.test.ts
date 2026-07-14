import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const goalCard = fs.readFileSync(
  path.join(root, 'src/components/goals/GoalCard.tsx'),
  'utf8'
);
const goalCardCss = fs.readFileSync(
  path.join(root, 'src/components/goals/GoalCard.module.css'),
  'utf8'
);

describe('goal realism current-state color', () => {
  it('renders the score through the shared state-aware class', () => {
    expect(goalCard).toContain('className={styles.realismScore}');
    expect(goalCard).not.toContain("? 'var(--state-victory)'");
    expect(goalCard).not.toContain("? 'var(--state-risk)'");
  });

  it('uses the current state token and tabular figures', () => {
    expect(goalCardCss).toMatch(
      /\.realismScore \{[\s\S]*color: var\(--state-color\)/
    );
    expect(goalCardCss).toMatch(
      /\.realismScore \{[\s\S]*font-variant-numeric: tabular-nums/
    );
  });
});
