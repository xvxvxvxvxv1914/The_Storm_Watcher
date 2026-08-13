import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() }),
}));

// The banner's only data source. Stubbed at the service boundary so the
// component, the hook's dismissal bookkeeping and the pure peak-picking all run
// for real — mocking the hook instead would leave nothing under test but JSX.
const getKpForecast = vi.fn();
vi.mock('../services/noaaApi', () => ({ getKpForecast: () => getKpForecast() }));

const bin = (hoursFromNow: number, kp: number) => ({
  time_tag: new Date(Date.now() + hoursFromNow * 3600_000).toISOString().replace(/\.\d{3}Z$/, ''),
  kp_index: kp,
});

/**
 * useStormOutlook is a module-level singleton — one poll and one dismissal
 * shared by every consumer, which is what production wants and what makes tests
 * bleed into each other. Re-import the whole graph per test so each one gets a
 * clean singleton instead of inheriting the previous test's outlook.
 */
async function renderFresh() {
  vi.resetModules();
  const { default: StormWatchBanner } = await import('./StormWatchBanner');
  return render(<MemoryRouter><StormWatchBanner /></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  getKpForecast.mockReset();
});

describe('StormWatchBanner', () => {
  it('announces the strongest storm NOAA predicts', async () => {
    getKpForecast.mockResolvedValue([bin(3, 5.0), bin(6, 6.33), bin(9, 4.0)]);
    await renderFresh();

    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('stormWatch.expected');
    expect(banner).toHaveTextContent('G2');
    expect(banner).toHaveTextContent('Kp 6.3');
  });

  it('stays out of the way when the next three days are quiet', async () => {
    getKpForecast.mockResolvedValue([bin(3, 3.0), bin(6, 4.67)]);
    await renderFresh();
    await waitFor(() => expect(getKpForecast).toHaveBeenCalled());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('links to the forecast rather than dead-ending', async () => {
    getKpForecast.mockResolvedValue([bin(6, 6.0)]);
    await renderFresh();
    expect(await screen.findByRole('link')).toHaveAttribute('href', '/forecast');
  });

  it('can be dismissed, and the dismissal survives a reload', async () => {
    getKpForecast.mockResolvedValue([bin(6, 6.0)]);
    const { unmount } = await renderFresh();

    await userEvent.click(await screen.findByRole('button'));
    expect(screen.queryByRole('status')).toBeNull();

    // A reload is a fresh module against the same localStorage.
    unmount();
    await renderFresh();
    await waitFor(() => expect(getKpForecast).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('re-opens when NOAA upgrades the storm past a G boundary', async () => {
    getKpForecast.mockResolvedValue([bin(6, 5.33)]);
    const { unmount } = await renderFresh();
    await userEvent.click(await screen.findByRole('button'));
    unmount();

    // Same peak time, G1 → G3. Dismissing a minor watch must not silence a
    // severe one; only a re-issue inside the same band stays dismissed.
    getKpForecast.mockResolvedValue([{ ...bin(6, 5.33), kp_index: 7.33 }]);
    await renderFresh();
    expect(await screen.findByRole('status')).toHaveTextContent('G3');
  });

  it('paints the severity, not a neutral chrome colour', async () => {
    // Colour carries the G-level here exactly as it does on the gauge and both
    // widgets; flattening the two bands to one would drop the signal.
    getKpForecast.mockResolvedValue([bin(6, 7.67)]);
    await renderFresh();
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('G3');
    expect(banner.className).toContain('#7f1d1d'); // red band, Kp ≥ 7
    expect(banner.className).not.toContain('#7c2d12');
  });

  it('survives a feed with NaN, nulls and junk timestamps', async () => {
    getKpForecast.mockResolvedValue([
      null,
      { time_tag: bin(3, 0).time_tag, kp_index: NaN },
      { time_tag: 'garbage', kp_index: 9 },
      bin(6, 5.67),
    ]);
    await renderFresh();
    expect(await screen.findByRole('status')).toHaveTextContent('Kp 5.7');
  });
});
