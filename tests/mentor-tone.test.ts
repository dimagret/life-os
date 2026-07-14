import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateMentorMessage } from '@/lib/mockMentor';
import type { MentorContext, StrictnessMode } from '@/types';

const modes: StrictnessMode[] = ['soft', 'standard', 'hard', 'owner'];

function message(mode: StrictnessMode, event: MentorContext['event']) {
  return generateMentorMessage({
    mode,
    event,
    abyssIndex: 20,
    innerCore: 50,
  });
}

describe('mentor tone matrix', () => {
  it('uses a distinct response for the same failure in every mode', () => {
    const variants = modes.map((mode) => message(mode, 'task_failed'));
    expect(new Set(variants).size).toBe(modes.length);
  });

  it('does not devalue completed work in hard or owner mode', () => {
    for (const mode of ['hard', 'owner'] as const) {
      const text = message(mode, 'task_completed').toLowerCase();
      expect(text).not.toContain('не подвиг');
      expect(text).not.toContain('не достижение');
      expect(text).toMatch(/засчит|выполнен/);
    }
  });

  it('does not label learning as procrastination without a confirmed pattern', () => {
    for (const mode of modes) {
      expect(message(mode, 'learning_trap').toLowerCase()).not.toContain('прокрастинац');
    }
  });

  it('keeps the anti-shame contract in the AI system prompt', () => {
    const route = readFileSync(resolve(process.cwd(), 'src/app/api/ai/route.ts'), 'utf8');
    expect(route).toContain('оценивай действие, данные и систему, а не личность человека');
    expect(route).toContain('любая негативная обратная связь заканчивается одним конкретным следующим шагом');
  });
});
