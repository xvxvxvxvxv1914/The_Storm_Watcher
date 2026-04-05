import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Menu, X, Globe } from 'lucide-react';
import { useLanguage, languages } from '../contexts/LanguageContext';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/forecast', label: t('nav.forecast') },
    { to: '/aurora', label: t('nav.aurora') },
    { to: '/alerts', label: t('nav.alerts') },
    { to: '/mood', label: t('nav.mood') },
    { to: '/pricing', label: t('nav.pricing') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Zap className="w-6 h-6 text-[#00ff88]" fill="#00ff88" />
            <span className="text-white">The Storm Watcher</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-[#00ff88]'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4" />
                {languages.find(l => l.code === language)?.flag}
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0a0a1a]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl py-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                        language === lang.code
                          ? 'text-[#00ff88] bg-[#00ff88]/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-[#0a0a1a]/95 backdrop-blur-md border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-[#00ff88] bg-[#00ff88]/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-white/10 pt-3 mt-3">
              <div className="text-xs font-semibold text-gray-400 px-4 mb-2 flex items-center gap-2">
                <Globe className="w-3 h-3" />
                Language
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    language === lang.code
                      ? 'text-[#00ff88] bg-[#00ff88]/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
