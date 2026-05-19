/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bg' | 'es' | 'fr' | 'de' | 'ru' | 'zh' | 'ja' | 'no' | 'fi' | 'sv' | 'is' | 'da' | 'pl' | 'uk' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Vite statically analyses the template so each locale becomes its own chunk
// and is fetched only when the user selects it.
const loaders: Record<Language, () => Promise<{ default: Record<string, string> }>> = {
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
const cache = new Map<Language, Record<string, string>>();

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    if (saved) return saved as Language;
    const supported: Language[] = ['en', 'bg', 'es', 'fr', 'de', 'ru', 'zh', 'ja', 'no', 'fi', 'sv', 'is', 'da', 'pl', 'uk', 'ko'];
    const nav = (navigator.language || navigator.languages?.[0] || 'en').slice(0, 2).toLowerCase();
    return supported.includes(nav as Language) ? (nav as Language) : 'en';
  });
  const [translations, setTranslations] = useState<Record<string, string>>(() => cache.get(language) ?? {});

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;

    const cached = cache.get(language);
    if (cached) {
      setTranslations(cached);
      return;
    }

    let cancelled = false;
    loaders[language]().then((mod) => {
      if (cancelled) return;
      cache.set(language, mod.default);
      setTranslations(mod.default);
    }).catch(() => {
      // Fall back silently — t() returns the key as a sensible default.
    });

    return () => { cancelled = true; };
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => translations[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
