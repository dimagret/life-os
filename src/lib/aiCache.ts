// Simple hash function for cache keys
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildCacheKey(prompt: string, mode: string, model: string, voiceTone: string): string {
  return hashString(`${prompt}|${mode}|${model}|${voiceTone}`);
}

// ——— Tier 1: In-Memory Cache (session) ———

interface MemoryCacheEntry {
  response: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

function getFromMemory(key: string): string | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.response;
}

function setInMemory(key: string, response: string): void {
  memoryCache.set(key, {
    response,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
}

// ——— Tier 2: LocalStorage Cache (persistent) ———

interface StorageCacheEntry {
  response: string;
  expiresAt: number;
}

const STORAGE_KEY = 'lifeos-ai-cache';
const STORAGE_LIMIT = 30;

function loadStorageCache(): Map<string, StorageCacheEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const data = JSON.parse(raw) as Record<string, StorageCacheEntry>;
    const map = new Map<string, StorageCacheEntry>();
    Object.entries(data).forEach(([key, entry]) => {
      if (Date.now() <= entry.expiresAt) {
        map.set(key, entry);
      }
    });
    return map;
  } catch {
    return new Map();
  }
}

function saveStorageCache(map: Map<string, StorageCacheEntry>): void {
  try {
    // Enforce limit (FIFO)
    const entries = Array.from(map.entries());
    if (entries.length > STORAGE_LIMIT) {
      entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      entries.splice(0, entries.length - STORAGE_LIMIT);
    }
    const obj = Object.fromEntries(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage might be full — ignore
  }
}

function getFromStorage(key: string): string | undefined {
  const cache = loadStorageCache();
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    saveStorageCache(cache);
    return undefined;
  }
  return entry.response;
}

function setInStorage(key: string, response: string, ttlHours: number): void {
  const cache = loadStorageCache();
  cache.set(key, {
    response,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  });
  saveStorageCache(cache);
}

// ——— Public API ———

export interface CacheConfig {
  ttlHours: number;
  usePersistent: boolean;
}

export const CACHE_CONFIGS = {
  goalAnalysis: { ttlHours: 24, usePersistent: true },
  /** Один сгенерированный день на (цель × ординал × язык); короче TTL. */
  dailyTrajectory: { ttlHours: 12, usePersistent: true },
  mentorMessage: { ttlHours: 1, usePersistent: false },
  courtVerdict: { ttlHours: 24, usePersistent: true },
} as const;

export function getCachedAIResponse(
  prompt: string,
  mode: string,
  model: string,
  voiceTone: string,
  config: CacheConfig
): string | undefined {
  const key = buildCacheKey(prompt, mode, model, voiceTone);

  // Check memory first (fast)
  const memoryResult = getFromMemory(key);
  if (memoryResult !== undefined) return memoryResult;

  // Check storage if persistent
  if (config.usePersistent) {
    const storageResult = getFromStorage(key);
    if (storageResult !== undefined) {
      // Promote to memory
      setInMemory(key, storageResult);
      return storageResult;
    }
  }

  return undefined;
}

export function setCachedAIResponse(
  prompt: string,
  mode: string,
  model: string,
  voiceTone: string,
  config: CacheConfig,
  response: string
): void {
  const key = buildCacheKey(prompt, mode, model, voiceTone);

  // Always set in memory
  setInMemory(key, response);

  // Also set in storage if persistent
  if (config.usePersistent) {
    setInStorage(key, response, config.ttlHours);
  }
}

// ——— Stats ———

export function getCacheStats(): { memoryEntries: number; storageEntries: number } {
  const cache = loadStorageCache();
  return {
    memoryEntries: memoryCache.size,
    storageEntries: cache.size,
  };
}

export function clearCache(): void {
  memoryCache.clear();
  localStorage.removeItem(STORAGE_KEY);
}
