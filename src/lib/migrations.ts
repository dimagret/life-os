import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './constants';

type Migration = (storage: Storage) => void;

// When bumping STORAGE_SCHEMA_VERSION to N, add migrations[N] here.
// Each migration runs once per user, in order, when their stored version < N.
const migrations: Record<number, Migration> = {
  // v2 (P2): UserProfile gained `skippedOnboarding`. Existing users completed
  // onboarding the normal way, so default to false.
  2: (storage) => {
    const raw = storage.getItem(STORAGE_KEYS.userProfile);
    if (!raw) return;
    try {
      const profile = JSON.parse(raw);
      if (profile && typeof profile === 'object' && profile.skippedOnboarding === undefined) {
        profile.skippedOnboarding = false;
        storage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
      }
    } catch {
      // corrupted profile blob — leave it; storage layer has its own fallback.
    }
  },
};

export function runMigrations(): void {
  if (typeof window === 'undefined') return;

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return; // private mode, sandboxing, etc.
  }

  let current = 0;
  try {
    const raw = storage.getItem(STORAGE_KEYS.schemaVersion);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (Number.isFinite(parsed)) current = parsed;
    }
  } catch {
    return;
  }

  if (current === STORAGE_SCHEMA_VERSION) return;

  if (current > STORAGE_SCHEMA_VERSION) {
    // The browser holds data from a newer build. Don't try to "downgrade" —
    // do nothing and let the newer code take over after the user reloads.
    if (typeof console !== 'undefined') {
      console.warn(
        `[lifeos] localStorage schema v${current} > app v${STORAGE_SCHEMA_VERSION}. ` +
          'Code is older than data; skipping migration.'
      );
    }
    return;
  }

  for (let v = current + 1; v <= STORAGE_SCHEMA_VERSION; v += 1) {
    const m = migrations[v];
    if (m) {
      try {
        m(storage);
      } catch (e) {
        if (typeof console !== 'undefined') {
          console.error(`[lifeos] migration to v${v} failed:`, e);
        }
        return;
      }
    }
  }

  try {
    storage.setItem(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION));
  } catch {
    // quota / private mode — ignore
  }
}
