import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pricing from './Pricing';
import TrialBanner from '../components/TrialBanner';
import ProTrialNudge from '../components/ProTrialNudge';
import en from '../locales/en';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => en[key] ?? key }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../utils/platform', () => ({ isNative: vi.fn(() => false), isMaterial: () => false }));
vi.mock('../hooks/useIAP', () => ({ useIAP: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../components/BreadcrumbSchema', () => ({ default: () => null }));
vi.mock('../components/StarField', () => ({ default: () => null }));

import { useAuth } from '../contexts/AuthContext';
import { isNative } from '../utils/platform';
import { useIAP } from '../hooks/useIAP';

const auth = vi.mocked(useAuth);

beforeEach(() => {
  // The free-launch policy must win even over an older paid-build setting.
  vi.stubEnv('VITE_PAYMENTS_ENABLED', 'true');
  auth.mockReturnValue({ user: null, profile: null, loading: true } as never);
  vi.mocked(isNative).mockReturnValue(false);
  vi.mocked(useIAP).mockClear();
});

afterEach(() => vi.unstubAllEnvs());

function renderPricing() {
  return render(<MemoryRouter><Pricing /></MemoryRouter>);
}

describe('free launch pricing', () => {
  it('offers full access without prices, billing controls or an account-loading gate', () => {
    renderPricing();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en['freeAccess.title']);
    expect(screen.getByRole('link', { name: en['nav.dashboard'] })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: en['auth.signIn'] })).toHaveAttribute('href', '/auth');
    expect(screen.getByText(en['freeAccess.accountNote'])).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText(/€|14-day free trial|choose your plan/i)).not.toBeInTheDocument();
    expect(useIAP).not.toHaveBeenCalled();
  });

  it('keeps native free access out of the IAP flow', () => {
    vi.mocked(isNative).mockReturnValue(true);
    renderPricing();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en['freeAccess.title']);
    expect(screen.queryByRole('button', { name: /restore purchases/i })).not.toBeInTheDocument();
    expect(useIAP).not.toHaveBeenCalled();
  });

  it('lets an existing subscriber reach their subscription management', () => {
    auth.mockReturnValue({ user: { id: 'u1' }, profile: { plan: 'pro', stripe_customer_id: 'cus_existing' }, loading: false } as never);
    renderPricing();
    expect(screen.getByRole('link', { name: en['pricing.manageSubscription'] })).toHaveAttribute('href', '/profile');
    expect(screen.queryByRole('link', { name: en['auth.signIn'] })).not.toBeInTheDocument();
    expect(screen.queryByText(/€|14-day free trial/i)).not.toBeInTheDocument();
  });

  it.each(['trialing', 'canceled', 'past_due', undefined])('hides trial and payment pitches for subscription status %s', subscriptionStatus => {
    auth.mockReturnValue({ user: { id: 'u1' }, profile: { plan: 'free', subscription_status: subscriptionStatus }, loading: false } as never);
    const { container } = render(<MemoryRouter><TrialBanner /><ProTrialNudge /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
