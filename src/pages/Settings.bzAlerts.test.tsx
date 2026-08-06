import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/**
 * The Bz toggle is worth a test for one reason: the value has to travel from
 * this screen into `device_push_tokens`, where the cron reads it. A control that
 * looks right but never reaches updateSettings leaves the user believing they
 * enabled a forecast alert that will never fire.
 */

const updateSettings = vi.fn();
const settings = {
  kpThreshold: 5,
  unitSystem: 'metric' as const,
  preferredLat: null,
  preferredLon: null,
  preferredLocationName: '',
  locationMode: 'auto' as const,
  bzAlertsEnabled: false,
  bzThreshold: -10,
};

vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ settings, updateSettings }) }));
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() }),
  languages: [{ code: 'en', name: 'English', flag: '🇬🇧' }],
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: null, updateProfile: vi.fn() }) }));
vi.mock('../hooks/usePaymentGate', () => ({ usePaymentGate: () => ({ hasPro: true, hasPremium: true }) }));
vi.mock('../hooks/useOnboarding', () => ({ useOnboarding: () => ({ reset: vi.fn() }) }));
vi.mock('../components/StarField', () => ({ default: () => null }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../components/LocationPicker', () => ({ default: () => null }));
vi.mock('../utils/reverseGeocode', () => ({ reverseGeocode: vi.fn() }));
vi.mock('../utils/geolocation', () => ({ getCurrentPosition: vi.fn() }));

import Settings from './Settings';

const renderSettings = () => render(<MemoryRouter><Settings /></MemoryRouter>);

describe('Settings — Bz early warning', () => {
  beforeEach(() => {
    updateSettings.mockClear();
    settings.bzAlertsEnabled = false;
    settings.bzThreshold = -10;
  });

  it('keeps the threshold slider hidden until the alert is switched on', async () => {
    renderSettings();
    expect(screen.queryByLabelText('settings.bzThreshold')).toBeNull();

    await userEvent.click(screen.getByRole('switch', { name: 'settings.bzAlerts' }));
    expect(screen.getByLabelText('settings.bzThreshold')).toBeInTheDocument();
  });

  it('saves the toggle so the cron can act on it', async () => {
    renderSettings();
    await userEvent.click(screen.getByRole('switch', { name: 'settings.bzAlerts' }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ bzAlertsEnabled: true, bzThreshold: -10 }),
    );
  });

  it('offers only southward thresholds — a positive one could never fire', async () => {
    settings.bzAlertsEnabled = true;
    renderSettings();

    const slider = screen.getByLabelText('settings.bzThreshold');
    expect(Number(slider.getAttribute('min'))).toBeLessThan(0);
    expect(Number(slider.getAttribute('max'))).toBeLessThan(0);
  });
});
