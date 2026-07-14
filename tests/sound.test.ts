import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playTimerEndChime } from '@/lib/sound';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeGain {
  gain = new FakeParam();
  connect = vi.fn().mockReturnThis();
}

class FakeOsc {
  type = 'sine';
  frequency = new FakeParam();
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  closed = false;
  createGain = vi.fn(() => new FakeGain());
  createOscillator = vi.fn(() => new FakeOsc());
  close = vi.fn(async () => {
    this.closed = true;
  });
  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

describe('playTimerEndChime', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('window', {
      AudioContext: FakeAudioContext,
      setTimeout: ((cb: () => void) => {
        cb();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not throw and creates an AudioContext when window has it', async () => {
    await expect(playTimerEndChime()).resolves.toBeUndefined();
    expect(FakeAudioContext.instances.length).toBe(1);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(ctx.close).toHaveBeenCalled();
  });

  it('is a no-op when AudioContext is not available', async () => {
    vi.stubGlobal('window', {});
    await expect(playTimerEndChime()).resolves.toBeUndefined();
    expect(FakeAudioContext.instances.length).toBe(0);
  });

  it('swallows constructor errors', async () => {
    vi.stubGlobal('window', {
      AudioContext: function ThrowingCtx() {
        throw new Error('boom');
      },
    });
    await expect(playTimerEndChime()).resolves.toBeUndefined();
  });
});
