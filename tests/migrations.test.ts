import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from '@/lib/constants';
import { runMigrations } from '@/lib/migrations';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe('localStorage migrations', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes the current schema version on a fresh install', () => {
    runMigrations();
    expect(window.localStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(STORAGE_SCHEMA_VERSION),
    );
  });

  it('v2 backfills `skippedOnboarding=false` for legacy profiles', () => {
    const legacy = {
      id: 'user-1',
      onboardingCompleted: true,
      contractAccepted: true,
      strictnessMode: 'standard',
    };
    window.localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(legacy));
    window.localStorage.setItem(STORAGE_KEYS.schemaVersion, '1');

    runMigrations();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.userProfile)!);
    expect(stored.skippedOnboarding).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(STORAGE_SCHEMA_VERSION),
    );
  });

  it('v2 leaves an explicitly set `skippedOnboarding` untouched', () => {
    const profile = {
      id: 'user-2',
      onboardingCompleted: true,
      skippedOnboarding: true,
      strictnessMode: 'standard',
    };
    window.localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
    window.localStorage.setItem(STORAGE_KEYS.schemaVersion, '1');

    runMigrations();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.userProfile)!);
    expect(stored.skippedOnboarding).toBe(true);
  });

  it('does not run migrations when current version equals app version', () => {
    const profile = { id: 'user-3' };
    window.localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
    window.localStorage.setItem(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION));

    runMigrations();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.userProfile)!);
    expect(stored.skippedOnboarding).toBeUndefined();
  });

  it('skips downgrades silently when storage holds a newer version', () => {
    window.localStorage.setItem(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION + 5));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    runMigrations();

    expect(warn).toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(STORAGE_SCHEMA_VERSION + 5),
    );
    warn.mockRestore();
  });
});
