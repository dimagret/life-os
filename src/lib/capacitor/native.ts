import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/** Лёгкая тактильная отдача (кнопки, успех). Безопасна в браузере (no-op). */
export async function hapticsImpactLight(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

/** Чтение строки из нативного хранилища (Android SharedPreferences). */
export async function preferencesGet(key: string): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    return null;
  }
}

export async function preferencesSet(key: string, value: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  } catch {
    /* ignore */
  }
}
