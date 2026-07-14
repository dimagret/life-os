import type { CapacitorConfig } from '@capacitor/cli';

/**
 * По умолчанию APK подгружает удалённый деплой (API routes + middleware работают).
 * Задайте CAPACITOR_SERVER_URL перед `npx cap sync`, например:
 *   cross-env CAPACITOR_SERVER_URL=https://your-app.vercel.app npx cap sync
 *
 * Локальная статическая сборка: CAPACITOR_WEB_DIR=dist после export в папку dist.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const webDir = process.env.CAPACITOR_WEB_DIR?.trim() || 'capacitor-www';

const allowMixedContent =
  process.env.CAPACITOR_ALLOW_MIXED === 'true' ||
  (!!serverUrl && serverUrl.startsWith('http://'));

const config: CapacitorConfig = {
  appId: 'com.lifeos.app',
  appName: 'Life OS',
  webDir,
  server: serverUrl
    ? {
        url: serverUrl.replace(/\/$/, ''),
        androidScheme: 'https',
        cleartext: serverUrl.startsWith('http://'),
      }
    : {
        androidScheme: 'https',
      },
  // Prod HTTPS: false; LAN http или CAPACITOR_ALLOW_MIXED=true — см. docs/android-apk.md
  android: {
    allowMixedContent,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B0D12',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
