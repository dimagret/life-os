import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const goalCard = fs.readFileSync(path.join(root, 'src/components/goals/GoalCard.tsx'), 'utf8');
const goalsClient = fs.readFileSync(path.join(root, 'src/app/[locale]/goals/GoalsClient.tsx'), 'utf8');

describe('weekly goal editing', () => {
  it('lets the user edit the visible weekly goal and external result', () => {
    expect(goalCard).toContain("onUpdate?: (patch: Pick<Goal, 'title' | 'externalResult'>) => void;");
    expect(goalCard).toContain("t('editGoalLabel')");
    expect(goalCard).toContain('externalResultDraft');
    expect(goalCard).toContain('onUpdate?.({ title, externalResult });');
  });

  it('persists the weekly-goal edit through the existing goal storage', () => {
    expect(goalsClient).toContain("import { getTodayPlan, loadGoals, updateGoal } from '@/lib/storage';");
    expect(goalsClient).toContain('updateGoal(goalId, patch);');
    expect(goalsClient).toContain('onUpdate={(patch) => handleWeeklyGoalUpdate(activeWeekly.id, patch)}');
  });
});