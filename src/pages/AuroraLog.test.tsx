import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AuroraLog from './AuroraLog';

const state = vi.hoisted(() => ({ free: true, user: { id: 'free-user' } as { id: string } | null }));
vi.mock('../../supabase/functions/_shared/accessPolicy', () => ({
  get FREE_ACCESS_ENABLED() { return state.free; },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user, profile: { plan: 'free' } }) }));
vi.mock('../utils/platform', () => ({ isNative: () => false }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }),
  },
}));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../components/BreadcrumbSchema', () => ({ default: () => null }));
vi.mock('../components/StarField', () => ({ default: () => null }));

beforeEach(() => {
  state.free = true;
  state.user = { id: 'free-user' };
  vi.stubEnv('VITE_PAYMENTS_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

it('lets a free account open its personal log during launch', async () => {
  render(<MemoryRouter><AuroraLog /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('button', { name: /Log sighting/ })).toBeInTheDocument());
  expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
});

it('still requires sign-in for a personal log during launch', () => {
  state.user = null;
  render(<MemoryRouter><AuroraLog /></MemoryRouter>);
  expect(screen.getByText('Sign in to access your Aurora Log')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Log sighting/ })).not.toBeInTheDocument();
});

it('restores the Pro gate when paid mode returns', async () => {
  state.free = false;
  render(<MemoryRouter><AuroraLog /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('link', { name: 'Upgrade to Pro' })).toBeInTheDocument());
});
