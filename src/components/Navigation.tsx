import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Menu, X, Globe } from 'lucide-react';
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
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Sun className="w-8 h-8 text-[#f97316] group-hover:text-[#fbbf24] transition-colors" />
              <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#f97316] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
            </div>
            <span className="text-xl font-bold gradient-solar">The Storm Watcher</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative text-sm font-bold uppercase tracking-wider transition-colors ${
                  isActive(link.to)
                    ? 'text-[#f97316]'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f97316] to-[#fbbf24] rounded-full glow-orange" />
                )}
              </Link>
            ))}

            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 text-sm font-bold text-[#94a3b8] hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4" />
                {languages.find(l => l.code === language)?.flag}
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 glass-surface rounded-xl shadow-2xl py-2 border border-[#f97316]/20">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                        language === lang.code
                          ? 'text-[#f97316] bg-[#f97316]/10'
                          : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
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
        <div className="md:hidden glass-surface border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${
                  isActive(link.to)
                    ? 'text-[#f97316] bg-[#f97316]/10 glow-orange'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-white/10 pt-3 mt-3">
              <div className="text-xs font-bold text-[#94a3b8] px-4 mb-2 flex items-center gap-2 uppercase tracking-wider">
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
                      ? 'text-[#f97316] bg-[#f97316]/10'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
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
