import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stormwatcher.app',
  appName: 'The Storm Watcher',
  webDir: 'dist',
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
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0a0a1a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
