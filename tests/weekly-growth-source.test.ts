import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const goalsClient = fs.readFileSync(path.join(root, 'src/app/[locale]/goals/GoalsClient.tsx'), 'utf8');
const weeklyCardPath = path.join(root, 'src/components/goals/WeeklyGrowthCard.tsx');

describe('weekly growth UI', () => {
  it('renders the weekly decision directly below the active weekly goal', () => {
    expect(fs.existsSync(weeklyCardPath)).toBe(true);
    expect(goalsClient).toContain('<WeeklyGrowthCard');
    expect(goalsClient.indexOf('<WeeklyGrowthCard')).toBeGreaterThan(goalsClient.indexOf('<GoalCard'));
  });

  it('keeps the commercial step conditional and labels evidence explicitly', () => {
    if (!fs.existsSync(weeklyCardPath)) return;
    const card = fs.readFileSync(weeklyCardPath, 'utf8');
    expect(card).toContain("goal.area === 'money' || goal.area === 'business'");
    expect(card).toContain("evidenceStatus");
    expect(card).toContain("t(`evidence.${snapshot.evidenceStatus}`)");
  });
});
