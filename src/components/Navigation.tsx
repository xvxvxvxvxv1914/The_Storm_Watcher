import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Menu, X, Globe, User, LogOut } from 'lucide-react';
import { useLanguage, languages } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PushNotificationBell from './PushNotificationBell';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [, setIsMoreOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, signOut } = useAuth();

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/forecast', label: t('nav.forecast') },
    { to: '/aurora', label: t('nav.aurora') },
    { to: '/alerts', label: t('nav.alerts') },
    { to: '/mood', label: t('nav.mood') },
  ];

  const moreLinks = [
    { to: '/uv', label: t('nav.uv') || 'UV' },
    { to: '/sun', label: t('nav.sun') || 'Sun' },
    { to: '/sky', label: t('nav.sky') || 'Sky Tonight' },
    { to: '/iss', label: t('nav.iss') || 'ISS' },
  ];

  const navLinks = [...mainLinks, ...moreLinks];

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
            <span className="hidden xl:inline text-xl font-bold gradient-solar whitespace-nowrap">The Storm Watcher</span>
          </Link>

          <div className="hidden lg:flex items-center flex-1 min-w-0 ml-3 xl:ml-5 gap-2 xl:gap-3">
            <div className="flex items-center justify-between flex-1 min-w-0 gap-0.5 xl:gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative flex-1 min-w-0 px-1 text-center text-[10px] xl:text-xs font-semibold transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                    isActive(link.to)
                      ? 'text-[#10b981]'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title={link.label}
                >
                  {link.to === '/sky' ? (
                    <>
                      <span className="xl:hidden">Sky</span>
                      <span className="hidden xl:inline">{link.label}</span>
                    </>
                  ) : link.to === '/iss' ? (
                    <>
                      <span className="xl:hidden">ISS</span>
                      <span className="hidden xl:inline">{link.label}</span>
                    </>
                  ) : (
                    link.label
                  )}
                  {isActive(link.to) && (
                    <div className="absolute -bottom-2 left-1 right-1 h-0.5 bg-gradient-to-r from-[#10b981] to-[#14b8a6] rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            <PushNotificationBell />

            <div className="relative shrink-0" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 text-xs xl:text-sm font-bold text-[#94a3b8] hover:text-white transition-colors"
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

            {user ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-4 py-2 rounded-lg bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden 2xl:inline text-sm font-medium max-w-[140px] truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-surface rounded-xl shadow-2xl py-2 border border-[#f97316]/20">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-sm font-medium text-white">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-[#94a3b8] mt-1">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('auth.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="shrink-0 px-2.5 xl:px-4 py-2 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-medium text-[11px] xl:text-sm hover:shadow-lg hover:shadow-[#f97316]/50 transition-all"
              >
                {t('auth.signIn')}
              </Link>
            )}
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
                className={`block px-4 py-2 rounded-lg text-center text-sm font-bold uppercase tracking-wide transition-colors ${
                  isActive(link.to)
                    ? 'text-[#10b981] bg-[#10b981]/10'
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

            {user && (
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="px-4 py-2 mb-2">
                  <p className="text-sm font-medium text-white">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-[#94a3b8] mt-1">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.logout')}
                </button>
              </div>
            )}

            {!user && (
              <div className="border-t border-white/10 pt-3 mt-3">
                <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-medium text-sm text-center"
                >
                  {t('auth.signIn')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
