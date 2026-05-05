export const logError = (msg: string, err?: unknown) => {
  // In production, we might want to suppress some noisy API fallback errors
  // unless we're actually tracking them via Sentry
  if (import.meta.env.DEV) {
    console.error(msg, err);
  }
  // TODO: Add Sentry or other error tracking here when configured
  // Sentry.captureException(err, { extra: { msg } })
};
