'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from './constants';

export type ThemePreference = 'dark' | 'light';
export type ResolvedTheme = ThemePreference;

const PREF_KEY = STORAGE_KEYS.theme;

function getSystemTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    // ignored
  }
  return getSystemTheme();
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref;
}

function applyTheme(pref: ThemePreference) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', pref);
}

/**
 * Hook to read & change the active theme preference. Persists to localStorage.
 * Legacy `system` or missing values resolve to the current OS light/dark mode.
 * Note: the inline anti-FOUC script in `layout.tsx` is what initially sets
 * `data-theme` *before* React hydrates; this hook keeps the state in sync.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    let isActive = true;
    function init() {
      const pref = readPreference();
      if (!isActive) return;
      setPreferenceState(pref);
      setResolved(resolveTheme(pref));
      applyTheme(pref);
    }
    init();
    return () => { isActive = false; };
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(resolveTheme(next));
    applyTheme(next);
    try {
      window.localStorage.setItem(PREF_KEY, next);
    } catch {
      // ignored — private mode etc.
    }
  };

  return { preference, resolved, setPreference };
}

/**
 * Inline-script source used in <head> to set `data-theme` *before* paint —
 * avoids a flash of dark UI when the user prefers light (or vice versa).
 *
 * Keep tiny and side-effect free. Embedded as `dangerouslySetInnerHTML`.
 */
export const ANTI_FOUC_SCRIPT = `
(function () {
  try {
    var key = '${PREF_KEY}';
    var pref = localStorage.getItem(key);
    var resolved = pref === 'dark' || pref === 'light'
      ? pref
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) { /* ignore */ }
})();
`;
