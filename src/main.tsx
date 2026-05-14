import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { LanguageProvider } from './contexts/LanguageContext';

registerSW({ immediate: true });

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        u.search = '';
        event.request.url = u.toString();
      } catch {}
    }
    return event;
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
