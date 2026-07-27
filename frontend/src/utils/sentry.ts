// Lazy-loaded Sentry integration for frontend error reporting.
// Only initializes if VITE_SENTRY_DSN environment variable is set.

let sentryInitialized = false;
const sentryPkgName = '@sentry/react';

export async function initSentry(): Promise<void> {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN;
  if (!dsn || sentryInitialized) return;

  try {
    const Sentry = await import(/* @vite-ignore */ sentryPkgName);
    Sentry.init({
      dsn,
      environment: (import.meta as any).env?.MODE || 'development',
      tracesSampleRate: parseFloat((import.meta as any).env?.VITE_SENTRY_TRACES_RATE || '0.1'),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
    sentryInitialized = true;
  } catch (e) {
    console.warn('Failed to initialize Sentry:', e);
  }
}

export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    const Sentry = await import(/* @vite-ignore */ sentryPkgName);
    if (context) {
      Sentry.withScope((scope: any) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (e) {
    console.warn('Failed to report error to Sentry:', e);
  }
}
