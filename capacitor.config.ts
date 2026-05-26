import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stormwatcher.app',
  appName: 'The Storm Watcher',
  webDir: 'dist',
  server: {
    // Use https scheme on Android WebView (avoids some localStorage/cookie quirks with file://)
    androidScheme: 'https',
  },
  plugins: {
    // CapacitorHttp patches fetch() on native to bypass WKWebView CORS for
    // third-party APIs (NOAA DONKI, GFZ). All fetch targets are HTTPS-only —
    // no HTTP endpoints exist, so ATS bypass is not a practical risk.
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a1a',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0a0a1a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
