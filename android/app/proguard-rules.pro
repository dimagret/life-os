# Baseline для возможного включения minifyEnabled в release.
# Сейчас minifyEnabled — false (быстрее первый релиз, меньше регрессий WebView/Capacitor).
# См. docs/android-apk.md.

-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# JS bridge в WebView — часто вызывается рефлексией
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Uncomment this to preserve the line number information for debugging stack traces.
#-keepattributes SourceFile,LineNumberTable
