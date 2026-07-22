import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadUserProfile,
  saveUserProfile,
  setStorageAccountScope,
} from '@/lib/storage';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

describe('account-scoped local cache', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() } as unknown as Window);
  });

  afterEach(() => {
    setStorageAccountScope(null);
    vi.unstubAllGlobals();
  });

  it('does not expose one account profile to another account', () => {
    setStorageAccountScope('user-a');
    saveUserProfile({ ...loadUserProfile(), name: 'Alice' });

    setStorageAccountScope('user-b');
    expect(loadUserProfile().name).toBeUndefined();
    saveUserProfile({ ...loadUserProfile(), name: 'Bob' });

    setStorageAccountScope('user-a');
    expect(loadUserProfile().name).toBe('Alice');
  });
});
