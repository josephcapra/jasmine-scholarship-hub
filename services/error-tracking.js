/**
 * Error Tracking Service
 * Lightweight Sentry integration for client-side error monitoring
 */

const ErrorTracking = (function() {
  'use strict';

  const SENTRY_DSN = ''; // Set via environment or config
  const APP_VERSION = '1.0.0';
  let initialized = false;

  function init(dsn) {
    if (initialized || !dsn) return;

    // Load Sentry SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/7.119.0/bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.Sentry) {
        window.Sentry.init({
          dsn: dsn,
          release: `jasmine-scholarship-hub@${APP_VERSION}`,
          environment: window.location.hostname === 'localhost' ? 'development' : 'production',
          tracesSampleRate: 0.1,
          beforeSend(event) {
            // Scrub sensitive data
            if (event.request?.headers) {
              delete event.request.headers['Authorization'];
            }
            return event;
          }
        });
        initialized = true;
        console.log('Error tracking initialized');
      }
    };
    document.head.appendChild(script);
  }

  function captureException(error, context = {}) {
    console.error('Error:', error, context);

    if (window.Sentry && initialized) {
      window.Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        window.Sentry.captureException(error);
      });
    }

    // Also send to our own endpoint for backup logging
    sendToBackend(error, context);
  }

  function captureMessage(message, level = 'info', context = {}) {
    console.log(`[${level}]`, message, context);

    if (window.Sentry && initialized) {
      window.Sentry.withScope((scope) => {
        scope.setLevel(level);
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        window.Sentry.captureMessage(message);
      });
    }
  }

  function setUser(user) {
    if (window.Sentry && initialized && user) {
      window.Sentry.setUser({
        id: user.id,
        email: user.email
      });
    }
  }

  function clearUser() {
    if (window.Sentry && initialized) {
      window.Sentry.setUser(null);
    }
  }

  async function sendToBackend(error, context) {
    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || String(error),
          stack: error.stack,
          context,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      // Silent fail - don't cause more errors
    }
  }

  // Global error handler
  function setupGlobalHandlers() {
    window.onerror = function(message, source, lineno, colno, error) {
      captureException(error || new Error(message), {
        source,
        lineno,
        colno
      });
      return false;
    };

    window.onunhandledrejection = function(event) {
      captureException(event.reason || new Error('Unhandled rejection'), {
        type: 'unhandledrejection'
      });
    };
  }

  return {
    init,
    captureException,
    captureMessage,
    setUser,
    clearUser,
    setupGlobalHandlers
  };
})();

if (typeof window !== 'undefined') {
  window.ErrorTracking = ErrorTracking;
  ErrorTracking.setupGlobalHandlers();
}
