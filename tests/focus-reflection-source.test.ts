import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const focusBlock = fs.readFileSync(
  path.join(process.cwd(), 'src/components/day/FocusBlock.tsx'),
  'utf8',
);

describe('focus distraction reflection', () => {
  it('asks for minimal recovery data only after distractions occurred', () => {
    expect(focusBlock).toContain('distractions.length > 0');
    expect(focusBlock).toContain('distractionMinutes');
    expect(focusBlock).toContain('primaryDistraction');
    expect(focusBlock).toContain('returnAction');
  });

  it('persists the reflection on the completed focus block', () => {
    expect(focusBlock).toContain('distractionMinutes: normalizedDistractionMinutes');
    expect(focusBlock).toContain('primaryDistraction: primaryDistraction ?? distractions[0]');
    expect(focusBlock).toContain('returnAction: returnAction.trim()');
  });
});
