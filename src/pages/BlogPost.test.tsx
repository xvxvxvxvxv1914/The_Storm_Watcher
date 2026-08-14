import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../contexts/LanguageContext', () => ({ useLanguage: vi.fn(() => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() })) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));
vi.mock('../components/StarField', () => ({ default: () => null }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../components/BreadcrumbSchema', () => ({ default: () => null }));
vi.mock('../components/AnimatedPage', () => ({ AnimatedPage: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { useLanguage } from '../contexts/LanguageContext';
import BlogPost from './BlogPost';

const renderPost = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/blog" element={<div data-testid="blog-index" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('BlogPost — lazily loaded article bodies', () => {
  it('renders the article once its chunk arrives', async () => {
    renderPost('what-is-iss-how-to-track');
    // By role, not text: the body has its own "What is the ISS?" heading.
    expect(await screen.findByRole('heading', { level: 1 }))
      .toHaveTextContent('What is the ISS and How to Track It');
  });

  // The trap in making this async: `post` is undefined on the first render, and
  // a plain falsy check would send every visitor to /blog before the body loads.
  it('does not redirect to the index while loading', () => {
    renderPost('what-is-iss-how-to-track');
    expect(screen.queryByTestId('blog-index')).toBeNull();
  });

  it('redirects to the index for an unknown slug', async () => {
    renderPost('no-such-article');
    expect(await screen.findByTestId('blog-index')).toBeInTheDocument();
  });

  it('renders the translated title when the post has that language', async () => {
    vi.mocked(useLanguage).mockReturnValue({ t: (k: string) => k, language: 'bg', setLanguage: vi.fn() } as never);
    renderPost('what-is-kp-index');
    // Bulgarian translation exists for this post; the English title must be gone.
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent(
      'What is the Kp Index? A Complete Guide');
  });
});

describe('BlogPost — document language', () => {
  // Wait on the language itself, never on the <h1>. The heading is committed to
  // the DOM one React task before the effect that writes lang runs — measured,
  // every time — so awaiting the heading and then asserting reads the value
  // mid-flight. That is a real race, not a theoretical one: it turned CI red on
  // run #752 with 'da', on a tree that passed on main seventeen seconds later.
  //
  // The prerendered HTML for an untranslated variant ships lang="en"; without
  // this, LanguageContext leaves <html lang="da"> around an English article.
  it('declares English while showing an untranslated article', async () => {
    vi.mocked(useLanguage).mockReturnValue({ t: (k: string) => k, language: 'da', setLanguage: vi.fn() } as never);
    document.documentElement.lang = 'da';

    renderPost('aurora-forecast-explained');

    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  it('leaves the language alone when the article really is translated', async () => {
    vi.mocked(useLanguage).mockReturnValue({ t: (k: string) => k, language: 'bg', setLanguage: vi.fn() } as never);
    document.documentElement.lang = 'bg';

    renderPost('what-is-kp-index');
    await screen.findByRole('heading', { level: 1 });
    // This one asserts a *non*-change, so it has the mirror-image problem:
    // asserting before the effects flush would pass even if the effect wrongly
    // overwrote lang. Flush first, then assert nothing moved.
    await act(async () => {});

    expect(document.documentElement.lang).toBe('bg');
  });
});
