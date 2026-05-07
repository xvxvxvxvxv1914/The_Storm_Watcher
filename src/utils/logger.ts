import * as Sentry from '@sentry/react';

export const logError = (msg: string, err?: unknown) => {
  if (import.meta.env.DEV) {
    console.error(msg, err);
  }
  Sentry.captureException(err instanceof Error ? err : new Error(msg), { extra: { msg } });
};
