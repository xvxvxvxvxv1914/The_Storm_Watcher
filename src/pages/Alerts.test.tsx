import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Alerts from './Alerts';

const feeds = vi.hoisted(() => ({ noaa: vi.fn(), cme: vi.fn(), flares: vi.fn() }));
vi.mock('../services/noaaApi', () => ({ getAlerts: feeds.noaa }));
vi.mock('../services/donkiApi', () => ({ getDonkiCme: feeds.cme, getDonkiFlares: feeds.flares }));
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../hooks/usePullToRefresh', () => ({ usePullToRefresh: () => ({ pulling: false, pullY: 0 }) }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../components/BreadcrumbSchema', () => ({ default: () => null }));
vi.mock('../components/StarField', () => ({ default: () => null }));

beforeEach(() => {
  feeds.noaa.mockReset().mockResolvedValue([]);
  feeds.cme.mockReset().mockResolvedValue([]);
  feeds.flares.mockReset().mockResolvedValue([]);
});

describe('alerts feed failures', () => {
  it('does not show all-clear when a source failed, and a retry recovers', async () => {
    feeds.cme.mockRejectedValue(new Error('DONKI unavailable'));
    render(<Alerts />);
    expect(await screen.findByText('alerts.fetchError')).toBeInTheDocument();
    expect(screen.queryByText('alerts.allClear')).not.toBeInTheDocument();
    feeds.cme.mockResolvedValue([]);
    fireEvent.click(screen.getByText('alerts.retry'));
    expect(await screen.findByText('alerts.allClear')).toBeInTheDocument();
  });

  it('keeps successful source data visible while another source failed', async () => {
    feeds.flares.mockResolvedValue([{ flrID: 'flr-1', beginTime: new Date().toISOString(), classType: 'M2.5', sourceLocation: 'N10E20' }]);
    feeds.cme.mockRejectedValue(new Error('DONKI unavailable'));
    render(<Alerts />);
    expect(await screen.findByText('alerts.fetchError')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/M2.5/).length).toBeGreaterThan(0));
    expect(screen.queryByText('alerts.allClear')).not.toBeInTheDocument();
  });
});
