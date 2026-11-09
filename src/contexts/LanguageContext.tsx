/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ALL_LANGS, langFromPath, persistLanguage } from '../utils/langUrl';

type Language = typeof ALL_LANGS[number];
type Messages = Record<string, string>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Vite statically analyses the template so each locale becomes its own chunk
// and is fetched only when the user selects it.
const loaders: Record<Language, () => Promise<{ default: Messages }>> = {
  en: () => import('../locales/en'),
  bg: () => import('../locales/bg'),
  es: () => import('../locales/es'),
  fr: () => import('../locales/fr'),
  de: () => import('../locales/de'),
  ru: () => import('../locales/ru'),
  zh: () => import('../locales/zh'),
  ja: () => import('../locales/ja'),
  no: () => import('../locales/no'),
  fi: () => import('../locales/fi'),
  sv: () => import('../locales/sv'),
  is: () => import('../locales/is'),
  da: () => import('../locales/da'),
  pl: () => import('../locales/pl'),
  uk: () => import('../locales/uk'),
  ko: () => import('../locales/ko'),
};

// In-memory cache so switching languages twice doesn't re-fetch.
const cache = new Map<Language, Messages>();

const isLanguage = (value: string | null): value is Language =>
  ALL_LANGS.some(language => language === value);

const loadMessages = async (language: Language): Promise<Messages> => {
  const cached = cache.get(language);
  if (cached) return cached;
  const { default: messages } = await loaders[language]();
  cache.set(language, messages);
  return messages;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [requestedLanguage, setLanguageState] = useState<Language>(() => {
    // URL prefix wins — `/de/sky` must render in German regardless of the saved
    // preference, so the page matches its prerendered HTML and canonical.
    const fromUrl = langFromPath(window.location.pathname);
    if (isLanguage(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem('language');
      if (isLanguage(saved)) return saved;
    } catch { /* storage may be blocked */ }
    const nav = (navigator.language || navigator.languages?.[0] || 'en').slice(0, 2).toLowerCase();
    return isLanguage(nav) ? nav : 'en';
  });
  const [loaded, setLoaded] = useState<{ language: Language; messages: Messages; fallback?: Messages }>();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    persistLanguage(requestedLanguage);
    let cancelled = false;
    // Load in parallel so missing local strings have an English fallback on first paint.
    const localized = loadMessages(requestedLanguage);
    const english = requestedLanguage === 'en' ? localized : loadMessages('en');
    Promise.allSettled([localized, english]).then(([current, fallback]) => {
      if (cancelled) return;
      if (current.status === 'fulfilled') {
        document.documentElement.lang = requestedLanguage;
        setLoaded({
          language: requestedLanguage,
          messages: current.value,
          fallback: fallback.status === 'fulfilled' ? fallback.value : undefined,
        });
      } else if (fallback.status === 'fulfilled') {
        document.documentElement.lang = 'en';
        setLoaded({ language: 'en', messages: fallback.value });
      } else {
        setLoadFailed(true);
      }
    });

    return () => { cancelled = true; };
  }, [requestedLanguage]);

  const setLanguage = (lang: Language) => {
    if (isLanguage(lang)) setLanguageState(lang);
  };

  if (!loaded) {
    return loadFailed ? (
      <p role="alert" className="p-6 text-center text-white">
        Could not load the interface.{' '}
        <button className="underline" onClick={() => window.location.reload()}>Reload</button>
      </p>
    ) : null;
  }

  const t = (key: string): string => loaded.messages[key] || loaded.fallback?.[key] || key;

  return (
    <LanguageContext.Provider value={{ language: loaded.language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const languages = [
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'no' as Language, name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi' as Language, name: 'Suomi', flag: '🇫🇮' },
  { code: 'sv' as Language, name: 'Svenska', flag: '🇸🇪' },
  { code: 'is' as Language, name: 'Íslenska', flag: '🇮🇸' },
  { code: 'de' as Language, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'da' as Language, name: 'Dansk', flag: '🇩🇰' },
  { code: 'fr' as Language, name: 'Français', flag: '🇫🇷' },
  { code: 'pl' as Language, name: 'Polski', flag: '🇵🇱' },
  { code: 'uk' as Language, name: 'Українська', flag: '🇺🇦' },
  { code: 'ja' as Language, name: '日本語', flag: '🇯🇵' },
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'bg' as Language, name: 'Български', flag: '🇧🇬' },
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
  { code: 'zh' as Language, name: '中文', flag: '🇨🇳' },
];
