import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getSession: vi.fn(),
  callback: null as null | ((event: string, session: Session | null) => void),
  logError: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: {
  auth: {
    getSession: mocks.getSession,
    onAuthStateChange: (callback: typeof mocks.callback) => {
      mocks.callback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  },
  from: () => ({ select: () => ({ eq: () => ({ abortSignal: (signal: AbortSignal) => ({ maybeSingle: () => mocks.query(signal) }) }) }) }),
} }));
vi.mock('../utils/logger', () => ({ logError: mocks.logError }));
vi.mock('../utils/platform', () => ({ isNative: () => false }));

const session = (id: string) => ({ user: { id } }) as Session;
function Probe() {
  const { user, profile, loading, profileError, retryProfile } = useAuth();
  return <>
    <div data-testid="state">{JSON.stringify({ user: user?.id, plan: profile?.plan, loading, profileError })}</div>
    <button onClick={retryProfile}>Retry profile</button>
  </>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!);
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(() => {
  mocks.query.mockReset();
  mocks.logError.mockReset();
  mocks.getSession.mockResolvedValue({ data: { session: session('u1') } });
});
afterEach(() => vi.useRealTimers());

describe('account profile recovery', () => {
  it('retries a returned Safari network error and recovers the paid plan', async () => {
    vi.useFakeTimers();
    mocks.query.mockResolvedValueOnce({ data: null, status: 0, error: { message: 'TypeError: Load failed' } })
      .mockResolvedValueOnce({ data: { id: 'u1', plan: 'premium' }, error: null, status: 200 });
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(state()).toMatchObject({ plan: 'premium', loading: false, profileError: false });
    expect(mocks.logError).not.toHaveBeenCalled();
  });

  it('exposes a failed profile separately and recovers with the retry button', async () => {
    mocks.query.mockResolvedValue({ data: null, status: 403, error: { message: 'permission denied' } });
    mount();
    await waitFor(() => expect(state()).toMatchObject({ loading: false, profileError: true }));
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(state().plan).toBeUndefined();
    mocks.query.mockResolvedValue({ data: { id: 'u1', plan: 'pro' }, error: null, status: 200 });
    fireEvent.click(screen.getByText('Retry profile'));
    await waitFor(() => expect(state()).toMatchObject({ plan: 'pro', profileError: false }));
  });

  it('ignores a pending profile response after logout', async () => {
    let resolve!: (value: unknown) => void;
    mocks.query.mockImplementation(() => new Promise(r => { resolve = r; }));
    mount();
    await waitFor(() => expect(mocks.query).toHaveBeenCalled());
    await act(async () => { mocks.callback!('SIGNED_OUT', null); });
    await act(async () => { resolve({ data: { id: 'u1', plan: 'premium' }, error: null, status: 200 }); });
    expect(state()).toEqual({ loading: false, profileError: false });
  });

  it('keeps the previous profile when refreshing it fails', async () => {
    mocks.query.mockResolvedValue({ data: { id: 'u1', plan: 'premium' }, error: null, status: 200 });
    mount();
    await waitFor(() => expect(state().plan).toBe('premium'));
    mocks.query.mockResolvedValue({ data: null, status: 403, error: { message: 'permission denied' } });
    fireEvent.click(screen.getByText('Retry profile'));
    await waitFor(() => expect(state()).toMatchObject({ plan: 'premium', loading: false, profileError: true }));
  });

  it('retries on reconnect and never carries the old plan to another account', async () => {
    mocks.query.mockResolvedValue({ data: { id: 'u1', plan: 'premium' }, error: null, status: 200 });
    mount();
    await waitFor(() => expect(state().plan).toBe('premium'));
    mocks.query.mockResolvedValue({ data: null, status: 403, error: { message: 'permission denied' } });
    await act(async () => { mocks.callback!('SIGNED_IN', session('u2')); });
    await waitFor(() => expect(state()).toMatchObject({ user: 'u2', profileError: true }));
    expect(state().plan).toBeUndefined();
    mocks.query.mockResolvedValue({ data: { id: 'u2', plan: 'free' }, error: null, status: 200 });
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(state()).toMatchObject({ user: 'u2', plan: 'free', profileError: false }));
  });
});
