import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

const locale = vi.hoisted(() => {
  let release = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  return { ready, release };
});

vi.mock('../locales/bg', async importOriginal => {
  await locale.ready;
  return importOriginal();
});

vi.mock('../locales/fr', async importOriginal => {
  const { default: messages } = await importOriginal<{ default: Record<string, string> }>();
  return { default: { ...messages, 'contact.send': '' } };
});

afterEach(() => {
  localStorage.removeItem('language');
  document.documentElement.removeAttribute('lang');
});

function Labels() {
  const { setLanguage, t } = useLanguage();
  return (
    <>
      <span>{t('nav.home')}</span>
      <span>{t('contact.send')}</span>
      <button onClick={() => setLanguage('fr')}>Français</button>
    </>
  );
}

it('waits for the selected locale and falls back to English for missing labels', async () => {
  localStorage.setItem('language', 'bg');
  render(<LanguageProvider><Labels /></LanguageProvider>);

  expect(screen.queryByText('nav.home')).not.toBeInTheDocument();
  locale.release();
  expect(await screen.findByText('Начало')).toBeInTheDocument();
  expect(screen.getByText('Изпрати съобщение')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Français' }));
  expect(await screen.findByText('Accueil')).toBeInTheDocument();
  expect(screen.getByText('Send message')).toBeInTheDocument();
});
