import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

// A variable reset in beforeEach, not per-test mock state — see CLAUDE.md on
// tests that poisoned their neighbours.
let language = 'en';
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ language }) }));

import PageMeta from './PageMeta';
import { loadPageMeta } from '../content/pageMeta';

const renderMeta = (path: string) =>
  render(
    <HelmetProvider>
      <PageMeta title="Dashboard — The Storm Watcher" description="English description" path={path} />
    </HelmetProvider>,
  );

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');

describe('PageMeta', () => {
  beforeEach(() => {
    language = 'en';
    document.title = 'prerendered';
  });

  it('uses the page’s own text in English', async () => {
    renderMeta('/dashboard');
    await waitFor(() => expect(document.title).toBe('Dashboard — The Storm Watcher'));
    expect(canonical()).toBe('https://www.thestormwatcher.com/dashboard');
  });

  // The bug: React replaced the prerendered Bulgarian title with the English prop.
  it('keeps the translated title on a translated page', async () => {
    language = 'bg';
    const bg = await loadPageMeta('bg');
    renderMeta('/dashboard');
    await waitFor(() => expect(document.title).toBe(bg['/dashboard'].title));
    expect(canonical()).toBe('https://www.thestormwatcher.com/bg/dashboard');
  });

  it('falls back to the page’s text for a route with no translation', async () => {
    language = 'bg';
    await loadPageMeta('bg');
    renderMeta('/settings');
    await waitFor(() => expect(document.title).toBe('Dashboard — The Storm Watcher'));
  });
});
