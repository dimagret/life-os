# Android APK (Capacitor)

## Режим по умолчанию: удалённый деплой

Серверные маршруты `/api/*` и middleware остаются на хостинге (например Vercel). APK через Capacitor открывает сайт по **`CAPACITOR_SERVER_URL`** — см. [capacitor.config.ts](../capacitor.config.ts).

### Переменные окружения (сводка)

| Переменная | Где задаётся | Назначение |
|------------|----------------|------------|
| **`NEXT_PUBLIC_SITE_URL`** | `.env` / хостинг сборки Next | Базовый origin для OG, клиентских вызовов `/api`, проверки deep links в [CapacitorBridge.tsx](../src/components/CapacitorBridge.tsx). |
| **`CAPACITOR_SERVER_URL`** | Только в оболочке при **`npm run cap:sync`** (не обязательно в `.env`) | URL, встраиваемый в нативную оболочку как `server.url` (удалённый WebView). |
| **`CAPACITOR_ALLOW_MIXED`** | Опционально | `true` — включить mixed content в Android WebView (редко; prod HTTPS обычно не нужен). |
| **`CAPACITOR_WEB_DIR`** | Опционально | Каталог веб-артефактов для статического режима (по умолчанию `capacitor-www`). |

Перед релизом желательно совпадение **host** у `NEXT_PUBLIC_SITE_URL` и `CAPACITOR_SERVER_URL`. Проверка:

```bash
set NEXT_PUBLIC_SITE_URL=https://your-domain.example
set CAPACITOR_SERVER_URL=https://your-domain.example
npm run check:capacitor-env
```

Симптомы рассинхрона: API 401/404 с клиента, открытие чужих ссылок из WebView, deep links не совпадают с ожидаемым доменом.

## Версия приложения (SSOT)

Единый источник версии — **`package.json`** (`version`, semver).

- Скрипт `scripts/sync-android-version.mjs` читает semver и записывает **`android/app/version.properties`** (`versionCode`, `versionName`). Файл **генерируемый**, в git не коммитится.
- Формула **`versionCode`**: `major×10000 + minor×100 + patch` (монотонно для типичных релизов Play).
- **`npm run cap:sync`** сначала вызывает синхронизацию версии, затем `cap sync`.

Если `version.properties` отсутствует, Gradle использует запасные значения, совместимые с текущим шаблоном; для воспроизводимых сборок выполняйте `npm run sync-android-version` перед `assemble*`.

## Подпись release

1. Создайте keystore локально (не коммитьте).
2. Скопируйте [android/keystore.properties.example](../android/keystore.properties.example) в **`android/keystore.properties`** и заполните пути/пароли.
3. В `android/app/build.gradle` тип `release` подхватит signing при наличии файла.
4. Play App Signing: загрузка AAB в консоль Play; локальный keystore может быть upload-ключом по [документации Google](https://support.google.com/googleplay/android-developer/answer/9842756).

В репозитории не хранятся: `keystore.properties`, `*.jks`, `*.keystore`.

## Сеть и безопасность

- **Mixed content:** для продакшена с `https://` в [capacitor.config.ts](../capacitor.config.ts) **`allowMixedContent`** выключен. Для `http://` (LAN) или явной отладки задайте **`CAPACITOR_ALLOW_MIXED=true`**.
- **Cleartext:** в манифесте `usesCleartextTraffic=false`; **`network_security_config.xml`** запрещает cleartext в release и разрешает в **debug** (`debug-overrides`) для локальной разработки.
- **POST_NOTIFICATIONS** (Android 13+): объявлено в манифесте для `@capacitor/push-notifications`; runtime-запрос и каналы — по документации плагина.

## ProGuard / R8

Сейчас в **`release`** включено **`minifyEnabled false`**, чтобы уменьшить риск регрессий WebView/Capacitor на первом релизе. В [proguard-rules.pro](../android/app/proguard-rules.pro) добавлены базовые `-keep` для последующего включения shrink/obfuscation. После смены на `true` обязательна smoke-сборка release APK/AAB и тест на устройстве.

## Splash и тема Android

- Цвет splash: **`#0B0D12`** — в `capacitor.config.ts` (`SplashScreen.backgroundColor`), в [colors.xml](../android/app/src/main/res/values/colors.xml) (`splash_background`), в стиле `AppTheme.NoActionBarLaunch` (`windowSplashScreenBackground`, `postSplashScreenTheme`). Согласовано с тёмным фоном и [CapacitorBridge.tsx](../src/components/CapacitorBridge.tsx) (StatusBar dark).

## App Links и Digital Asset Links

В [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) добавлен intent-filter с **`android:autoVerify="true"`** и заглушкой **`your-deployment.example`**. Замените **`android:host`** на реальный хост из `NEXT_PUBLIC_SITE_URL` (без схемы и пути).

Разместите на домене **`/.well-known/assetlinks.json`** (пример шаблона — ниже). SHA256 отпечаток возьмите из upload-ключа или из Play Console (App Signing).

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.lifeos.app",
    "sha256_cert_fingerprints": [
      "REPLACE_WITH_SHA256_CERT_FINGERPRINT"
    ]
  }
}]
```

Отпечаток берите из **Play App Signing** (или upload-key), в формате, который ожидает [документация App Links](https://developer.android.com/training/app-links/verify-site-associations).

Проверка: `adb shell pm verify-app-links --re-verify com.lifeos.app` и открытие `https://ваш-хост/...` с устройства.

## Офлайн и WebView

При режиме **`server.url`** без сети WebView не загрузит контент. В приложении показывается лёгкий баннер «нет сети» ([NetworkBanner.tsx](../src/components/NetworkBanner.tsx)): нативно через `@capacitor/network`, в браузере через `navigator.onLine`.

## Статический экспорт (опционально)

Экспорт конфликтует с API routes и middleware. Используйте скрипты:

1. `node scripts/prepare-static-export.mjs`
2. `set CAPACITOR_STATIC_EXPORT=true && npm run build`
3. `node scripts/restore-static-export.mjs`
4. `set CAPACITOR_WEB_DIR=dist && npm run cap:sync`

Укажите **`NEXT_PUBLIC_SITE_URL`** на живой backend — вызовы AI пойдут на сервер.

## Сборка APK / AAB

1. Установите Android Studio и JDK 17.
2. Задайте `CAPACITOR_SERVER_URL` при необходимости, затем **`npm run cap:sync`**, откройте проект: **`npm run cap:open:android`**.
3. **Build → Generate Signed App Bundle or APK** или из каталога `android`: `./gradlew assembleRelease` / `bundleRelease` (после **`keystore.properties`**).

Debug-сборка без секретов: `./gradlew assembleDebug`.

## CI

В **корне git-репозитория** (у монорепо — рядом с папкой `life-os/`) лежит **`.github/workflows/android-build.yml`**: рабочий каталог `life-os/`, затем `npm ci`, `node scripts/sync-android-version.mjs`, **`assembleDebug`** в `android/` без подписи. Workflow внутри `life-os/.github/` не используется GitHub — только корневой `.github/`.

## Проверка на устройстве

- Установка через USB (`adb install`) или передача `.apk`.
- Проверить вход с экрана списка задач, навигацию «Назад», переключение локали, баннер офлайн при отключении сети.

## Deep links

Обработчик `appUrlOpen` в [CapacitorBridge.tsx](../src/components/CapacitorBridge.tsx) перенаправляет путь в Next Router. Доменные ссылки должны совпадать с `NEXT_PUBLIC_SITE_URL`; intent-filter в манифесте должен использовать тот же host.
