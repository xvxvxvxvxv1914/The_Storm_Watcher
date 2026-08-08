import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The gate exists purely to keep react-joyride out of the main bundle, so the
 * thing worth testing is *whether it imports at all* — a gate that always loads
 * would still pass a "does the tour show" test while silently undoing the split.
 */
const tourLoaded = vi.fn();
vi.mock('./JoyrideTour', () => {
  tourLoaded();
  return { default: () => <div data-testid="tour" /> };
});

const seen = { value: false };
vi.mock('../hooks/useOnboarding', () => ({
  useOnboarding: () => ({ seen: seen.value, markSeen: vi.fn(), reset: vi.fn() }),
}));

import OnboardingTour from './OnboardingTour';

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><OnboardingTour /></MemoryRouter>);

describe('OnboardingTour gate', () => {
  beforeEach(() => {
    seen.value = false;
    tourLoaded.mockClear();
  });

  // Declaration order matters: once any test loads the module, the registry
  // caches it and `tourLoaded` can never fire again. The negatives run first,
  // while "was it imported at all" is still an answerable question.
  it('does not load the tour on other pages', async () => {
    renderAt('/faq');
    await waitFor(() => expect(screen.queryByTestId('tour')).toBeNull());
    expect(tourLoaded).not.toHaveBeenCalled();
  });

  it('does not load the tour for a returning visitor', async () => {
    seen.value = true;
    renderAt('/dashboard');
    await waitFor(() => expect(screen.queryByTestId('tour')).toBeNull());
    expect(tourLoaded).not.toHaveBeenCalled();
  });

  it('loads the tour for a first-time visitor on /dashboard', async () => {
    renderAt('/dashboard');
    expect(await screen.findByTestId('tour')).toBeInTheDocument();
    expect(tourLoaded).toHaveBeenCalled();
  });
});
