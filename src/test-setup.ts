import '@testing-library/jest-dom';

// Payments are ON by default in tests; override with vi.stubEnv('VITE_PAYMENTS_ENABLED', 'false') per test.
Object.assign(import.meta.env, { VITE_PAYMENTS_ENABLED: 'true' });
