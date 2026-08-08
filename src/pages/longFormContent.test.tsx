import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * FAQ and MagneticEffects load their translation with a dynamic `import()` so a
 * visitor downloads one language instead of all 16. A broken or renamed loader
 * would not fail the build — the page would just render its skeleton forever —
 * so these tests assert real translated text reaches the DOM.
 */

vi.mock('../contexts/LanguageContext', () => ({ useLanguage: vi.fn() }));
vi.mock('../components/StarField', () => ({ default: () => null }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../components/BreadcrumbSchema', () => ({ default: () => null }));
vi.mock('../hooks/useKpLive', () => ({ useKpLive: () => null }));
vi.mock('../services/noaaApi', () => ({
  getStormStatus: () => null,
  getKpGradientStyle: () => ({}),
}));

import { useLanguage } from '../contexts/LanguageContext';
import FAQ from './FAQ';
import MagneticEffects from './MagneticEffects';

const mockUseLanguage = vi.mocked(useLanguage);

function setLanguage(language: string) {
  mockUseLanguage.mockReturnValue({ t: (k: string) => k, language, setLanguage: vi.fn() } as never);
}

describe('FAQ — lazily loaded translations', () => {
  it('renders English questions', async () => {
    setLanguage('en');
    render(<MemoryRouter><FAQ /></MemoryRouter>);
    expect(await screen.findByText(/What is the Aurora Borealis/)).toBeInTheDocument();
  });

  it('renders German questions', async () => {
    setLanguage('de');
    render(<MemoryRouter><FAQ /></MemoryRouter>);
    expect(await screen.findByText(/Was ist das Aurora Borealis/)).toBeInTheDocument();
  });

  it('falls back to English for an unknown language', async () => {
    setLanguage('xx');
    render(<MemoryRouter><FAQ /></MemoryRouter>);
    expect(await screen.findByText(/What is the Aurora Borealis/)).toBeInTheDocument();
  });
});

describe('MagneticEffects — lazily loaded translations', () => {
  it('renders English sections', async () => {
    setLanguage('en');
    render(<MemoryRouter><MagneticEffects /></MemoryRouter>);
    expect(await screen.findByText('What Is a Geomagnetic Storm?')).toBeInTheDocument();
  });

  it('renders Bulgarian sections', async () => {
    setLanguage('bg');
    render(<MemoryRouter><MagneticEffects /></MemoryRouter>);
    expect(await screen.findByText('Какво е геомагнитна буря?')).toBeInTheDocument();
  });

  it('falls back to English for an unknown language', async () => {
    setLanguage('xx');
    render(<MemoryRouter><MagneticEffects /></MemoryRouter>);
    expect(await screen.findByText('What Is a Geomagnetic Storm?')).toBeInTheDocument();
  });
});
