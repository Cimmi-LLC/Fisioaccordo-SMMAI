import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'

// ── Sentry error monitoring ──
// GDPR-compliant config:
//   - sendDefaultPii: false (no IP, no user-agent fingerprinting by default)
//   - tracesSampleRate: 0.1 (10% of transactions for performance — safe quota)
//   - environment from build mode (development vs production)
//   - beforeSend strips any URL search params that might leak tokens/email
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
  || 'https://eafb9f6407fd06bccbcc40cde0b520be@o4511485394288640.ingest.de.sentry.io/4511485405429840';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 0,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Drop noisy/uninteresting errors before sending
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'AbortError',
      'cancelled',
    ],
    beforeSend(event) {
      // Strip query strings from URLs (may contain auth tokens, etc.)
      if (event.request?.url) {
        try { event.request.url = event.request.url.split('?')[0]; } catch { /* ignore */ }
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
