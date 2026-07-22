import { describe, expect, it } from 'vitest';
import { deriveActivationProfile, deriveActivationProgram } from '@/lib/activationProfile';

describe('activation discipline profile', () => {
  it.each([
    {
      label: 'energy depleted before work',
      input: {
        cadence: 'sometimes',
        sabotage: ['delay'],
        distractions: ['internal'],
        focusMinutes: 15,
        dailyMinutes: 45,
        energy: 'low',
      },
      profileId: 'depleted',
      mode: 'gentle',
    },
    {
      label: 'overload and low energy',
      input: {
        cadence: 'sometimes',
        sabotage: ['overload', 'perfectionism'],
        distractions: ['gadget'],
        focusMinutes: 20,
        dailyMinutes: 180,
        energy: 'low',
      },
      profileId: 'overloaded',
      mode: 'gentle',
    },
    {
      label: 'avoidance before starting',
      input: {
        cadence: 'rare',
        sabotage: ['delay'],
        distractions: ['internal'],
        focusMinutes: 25,
        dailyMinutes: 90,
        energy: 'variable',
      },
      profileId: 'avoidant',
      mode: 'gentle',
    },
    {
      label: 'perfectionism raises the start threshold',
      input: {
        cadence: 'often',
        sabotage: ['perfectionism', 'planning'],
        distractions: ['gadget'],
        focusMinutes: 35,
        dailyMinutes: 120,
        energy: 'variable',
      },
      profileId: 'perfectionist',
      mode: 'base',
    },
    {
      label: 'preparation replacing execution',
      input: {
        cadence: 'often',
        sabotage: ['planning', 'learning'],
        distractions: ['research'],
        focusMinutes: 30,
        dailyMinutes: 120,
        energy: 'variable',
      },
      profileId: 'analytical',
      mode: 'base',
    },
    {
      label: 'busywork replaces visible output',
      input: {
        cadence: 'often',
        sabotage: ['switch'],
        distractions: ['busywork'],
        focusMinutes: 30,
        dailyMinutes: 90,
        energy: 'variable',
      },
      profileId: 'busywork',
      mode: 'base',
    },
    {
      label: 'attention fragmented across switches',
      input: {
        cadence: 'often',
        sabotage: ['switch'],
        distractions: ['gadget', 'social', 'otherTasks', 'busywork'],
        focusMinutes: 30,
        dailyMinutes: 120,
        energy: 'stable',
      },
      profileId: 'fragmented',
      mode: 'gentle',
    },
    {
      label: 'stable repeatable rhythm',
      input: {
        cadence: 'stable',
        sabotage: ['delay'],
        distractions: ['gadget'],
        focusMinutes: 45,
        dailyMinutes: 180,
        energy: 'stable',
      },
      profileId: 'stable',
      mode: 'intensive',
    },
  ])('derives a distinct profile for $label', ({ input, profileId, mode }) => {
    expect(deriveActivationProfile(input)).toMatchObject({ profileId, recommendedMode: mode });
  });

  it('uses a building profile when no single risk dominates', () => {
    expect(deriveActivationProfile({
      cadence: 'sometimes',
      sabotage: ['perfectionism'],
      distractions: ['gadget'],
      focusMinutes: 30,
      dailyMinutes: 90,
      energy: 'variable',
    })).toMatchObject({ profileId: 'building', recommendedMode: 'base' });
  });

  it('keeps exact answer evidence when different combinations share one profile', () => {
    const planning = deriveActivationProfile({
      cadence: 'often',
      sabotage: ['planning'],
      distractions: ['research'],
      focusMinutes: 25,
      dailyMinutes: 90,
      energy: 'variable',
    });
    const learning = deriveActivationProfile({
      cadence: 'stable',
      sabotage: ['learning'],
      distractions: ['busywork'],
      focusMinutes: 40,
      dailyMinutes: 150,
      energy: 'stable',
    });

    expect(planning.profileId).toBe('analytical');
    expect(learning.profileId).toBe('analytical');
    expect(planning.evidence).toEqual({
      cadence: 'often',
      sabotage: ['planning'],
      distractions: ['research'],
      focusMinutes: 25,
      dailyMinutes: 90,
      energy: 'variable',
    });
    expect(learning.evidence).not.toEqual(planning.evidence);
  });

  it('handles every answer subset across boundary capacity cases', () => {
    const sabotageIds = ['delay', 'perfectionism', 'planning', 'learning', 'switch', 'overload'];
    const distractionIds = ['gadget', 'social', 'research', 'otherTasks', 'busywork', 'internal'];
    const subsets = (ids: string[]) => Array.from({ length: 2 ** ids.length }, (_, mask) =>
      ids.filter((_, index) => (mask & (1 << index)) !== 0)
    );
    const validProfiles = new Set([
      'depleted', 'overloaded', 'avoidant', 'perfectionist', 'analytical',
      'busywork', 'fragmented', 'building', 'stable',
    ]);
    const validModes = new Set(['gentle', 'base', 'intensive']);
    const capacityCases = [
      { focusMinutes: 10, dailyMinutes: 30 },
      { focusMinutes: 45, dailyMinutes: 120 },
      { focusMinutes: 90, dailyMinutes: 240 },
    ];
    const seenProfiles = new Set<string>();
    let caseCount = 0;

    for (const cadence of ['rare', 'sometimes', 'often', 'stable']) {
      for (const sabotage of subsets(sabotageIds)) {
        for (const distractions of subsets(distractionIds)) {
          for (const energy of ['low', 'variable', 'stable']) {
            for (const capacity of capacityCases) {
              const result = deriveActivationProfile({ cadence, sabotage, distractions, energy, ...capacity });
              if (!validProfiles.has(result.profileId)) throw new Error(`Unknown profile: ${result.profileId}`);
              if (!validModes.has(result.recommendedMode)) throw new Error(`Unknown mode: ${result.recommendedMode}`);
              seenProfiles.add(result.profileId);
              caseCount += 1;
            }
          }
        }
      }
    }

    expect(caseCount).toBe(147_456);
    expect(seenProfiles).toEqual(validProfiles);
  });

  it('turns the same capacity into different starting programs by profile', () => {
    expect(deriveActivationProgram({
      profileId: 'depleted',
      mode: 'gentle',
      focusMinutes: 45,
      dailyMinutes: 120,
    })).toEqual({ focus: 10, blocks: 1, volume: 45, tasks: 1 });

    expect(deriveActivationProgram({
      profileId: 'analytical',
      mode: 'base',
      focusMinutes: 45,
      dailyMinutes: 120,
    })).toEqual({ focus: 35, blocks: 2, volume: 95, tasks: 3 });

    expect(deriveActivationProgram({
      profileId: 'stable',
      mode: 'intensive',
      focusMinutes: 45,
      dailyMinutes: 120,
    })).toEqual({ focus: 50, blocks: 4, volume: 120, tasks: 5 });
  });
});
