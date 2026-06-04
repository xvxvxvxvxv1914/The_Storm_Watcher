import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Globe, User, LogOut, ChevronDown, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { useLanguage, languages } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PushNotificationBell from './PushNotificationBell';
import { useKpLive } from '../hooks/useKpLive';

const Navigation = () => {
  const stormKp = useKpLive();
  const isStorm = stormKp !== null && stormKp >= 5;

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLangMenuOpen(false);
        setIsMoreOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const mainLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/forecast', label: t('nav.forecast') },
    { to: '/aurora', label: t('nav.aurora') },
    { to: '/alerts', label: t('nav.alerts') },
    { to: '/calendar', label: t('nav.calendar') || 'Aurora Calendar' },
  ];

  const moreLinks = [
    // Aurora extras
    { to: '/aurora-map',       label: t('nav.auroraMap') || 'Aurora Map' },
    { to: '/livestream',       label: t('nav.livestream') || 'Livestream' },
    { to: '/gallery',          label: t('nav.gallery') || 'Gallery' },
    { to: '/hunt',             label: t('nav.hunt') || 'Aurora Hunt' },
    { to: '/mood',             label: t('nav.mood') },
    // Tools
    { to: '/uv',               label: t('nav.uv') },
    { to: '/sun',              label: t('nav.sun') },
    { to: '/sky',              label: t('nav.sky') },
    { to: '/iss',              label: t('nav.iss') },
    // Info
    { to: '/magnetic-effects', label: t('nav.magneticEffects') },
    { to: '/referrals',        label: t('nav.referrals') || 'Refer & Earn' },
    { to: '/faq',              label: t('nav.faq') },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isMoreActive = moreLinks.some(link => isActive(link.to));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Mobile: floating pill matching bottom tab bar */}
      <div className="lg:hidden flex items-center justify-between mx-3 mt-2 px-4 py-2.5 rounded-full" style={{
        background: theme === 'light' ? 'rgba(242,242,247,0.82)' : 'rgba(18,18,30,0.82)',
        backdropFilter: 'blur(10px) saturate(180%)',
        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        border: theme === 'light' ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)',
        boxShadow: theme === 'light'
          ? '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'
          : '0 4px 20px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3)',
      }}>
        <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
          <img src="/logos/icon.svg" alt="The Storm Watcher" className="w-7 h-7" />
          <span className="text-sm font-bold gradient-solar">The Storm Watcher</span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <PushNotificationBell />
          ) : (
            <Link
              to="/auth"
              className="px-3 py-1 rounded-full bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold text-xs"
            >
              {t('auth.signIn')}
            </Link>
          )}
        </div>
      </div>

      {/* Desktop: full-width glass bar */}
      <div className="hidden lg:block glass-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {theme === 'dark' ? (
              <img src="/logos/logo-transparent.png" alt="The Storm Watcher" className="h-8 w-auto" />
            ) : (
              <>
                <img src="/logos/icon.svg" alt="" className="w-8 h-8" />
                <span className="hidden xl:inline text-xl font-bold text-slate-800 whitespace-nowrap">The Storm Watcher</span>
              </>
            )}
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center flex-1 min-w-0 ml-3 xl:ml-5 gap-2 xl:gap-3">
            <div className="flex items-center gap-1 xl:gap-2">
              {mainLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-2 xl:px-3 py-1 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive(link.to) ? 'text-[#10b981]' : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <div className="absolute -bottom-2 left-1 right-1 h-0.5 bg-gradient-to-r from-[#10b981] to-[#14b8a6] rounded-full" />
                  )}
                </Link>
              ))}

              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  aria-expanded={isMoreOpen}
                  aria-haspopup="menu"
                  className={`relative flex items-center gap-1 px-2 xl:px-3 py-1 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap ${
                    isMoreActive ? 'text-[#10b981]' : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {t('nav.more')}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                  {isMoreActive && (
                    <div className="absolute -bottom-2 left-1 right-1 h-0.5 bg-gradient-to-r from-[#10b981] to-[#14b8a6] rounded-full" />
                  )}
                </button>
                {isMoreOpen && (
                  <div
                    className="absolute left-0 mt-3 w-96 rounded-xl shadow-2xl py-2 border border-[#10b981]/20"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(10,10,26,0.95)' : 'rgba(255,255,255,0.97)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <div className="grid grid-cols-2">
                      {moreLinks.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setIsMoreOpen(false)}
                          className={`block px-4 py-2 text-sm font-medium transition-colors ${
                            isActive(link.to)
                              ? 'text-[#10b981] bg-[#10b981]/10'
                              : theme === 'dark'
                                ? 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <PushNotificationBell />

            <button
              onClick={toggleTheme}
              className="text-xl shrink-0 leading-none hover:opacity-80 transition-opacity"
              aria-label={theme === 'dark' ? t('nav.switchLight') : t('nav.switchDark')}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            <div className="relative shrink-0" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                aria-label={t('nav.language')}
                aria-expanded={isLangMenuOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-1.5 text-xs xl:text-sm font-bold text-[#94a3b8] hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4" />
                {languages.find(l => l.code === language)?.flag}
              </button>
              {isLangMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl py-2 border border-[#f97316]/20"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(10,10,26,0.95)' : 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                        language === lang.code
                          ? 'text-[#f97316] bg-[#f97316]/10'
                          : theme === 'dark'
                            ? 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/pricing"
              className={`shrink-0 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-colors border ${
                isActive('/pricing')
                  ? 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10'
                  : 'text-[#94a3b8] border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {t('nav.pricing') || 'Pricing'}
            </Link>

            {user ? (
              <div data-tour="user-menu" className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-4 py-2 rounded-lg bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden 2xl:inline text-sm font-medium max-w-[140px] truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                </button>
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl py-2 border border-[#f97316]/20"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(10,10,26,0.95)' : 'rgba(255,255,255,0.97)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <div className={`px-4 py-2 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{profile?.full_name || t('nav.user')}</p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{user.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-[#94a3b8] hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                      <User className="w-4 h-4" />{t('nav.profile')}
                    </Link>
                    <Link to="/settings" onClick={() => setIsUserMenuOpen(false)} className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-[#94a3b8] hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                      <SlidersHorizontal className="w-4 h-4" />{t('nav.settings')}
                    </Link>
                    <button onClick={handleLogout} className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-[#94a3b8] hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                      <LogOut className="w-4 h-4" />{t('auth.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                data-tour="user-menu"
                to="/auth"
                className="shrink-0 px-2.5 xl:px-4 py-2 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-medium text-[11px] xl:text-sm hover:shadow-lg hover:shadow-[#f97316]/50 transition-all"
              >
                {t('auth.signIn')}
              </Link>
            )}
          </div>

        </div>
      </div>
      </div>

      {isStorm && (
        <div role="alert" aria-live="assertive" className="bg-gradient-to-r from-[#ef4444] via-[#f97316] to-[#7c3aed] px-4 py-2 pulse-alert">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span className="text-white font-bold uppercase tracking-wider text-xs sm:text-sm">
              {t('home.stormBanner')} {stormKp?.toFixed(1)}
            </span>
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          </div>
        </div>
      )}
    </nav>
  );
};

export default React.memo(Navigation);
