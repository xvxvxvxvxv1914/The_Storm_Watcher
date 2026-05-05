# Capacitor — keep all plugin classes and JS bridge intact
-keep class com.getcapacitor.** { *; }
-keep class com.stormwatcher.app.** { *; }
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers for crash stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
