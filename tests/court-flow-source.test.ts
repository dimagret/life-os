import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('evening review flow', () => {
  it('presents task status controls as one semantic choice per task', () => {
    const source = read('src/components/court/ActionCourt.tsx');
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked=');
    expect(source).not.toContain('previewVerdict');
    expect(source).toContain('taskSummary.partialTaskIds.length > 0');
    expect(source).toContain('summary.partialTaskIds.includes(task.id)');
  });

  it('reviews one unfinished task reason at a time and explains missing input', () => {
    const source = read('src/components/court/FailureReview.tsx');
    expect(source).toContain('activeIndex');
    expect(source).toContain('activeFailure');
    expect(source).toContain('role="alert"');
    expect(source).toContain("t('reasonMissing')");
  });

  it('shows an explicit risk direction and the persisted tomorrow correction', () => {
    const screen = read('src/components/court/VerdictScreen.tsx');
    const client = read('src/app/[locale]/action-court/ActionCourtClient.tsx');
    expect(screen).toContain("t('riskChange.increased'");
    expect(screen).toContain("t('riskChange.decreased'");
    expect(screen).toContain('tomorrowAdjustment?.trim()');
    expect(client).toContain('result.tomorrowAdjustment = tomorrowAdjustment');
  });
});
