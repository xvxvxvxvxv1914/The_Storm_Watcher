import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, TrendingUp, Sparkles, MoreHorizontal,
  X, Sun, Eye, Satellite, AlertTriangle, SmilePlus,
  User, LogOut, SlidersHorizontal, Globe, ChevronDown,
  Magnet, HelpCircle,
} from 'lucide-react';
import { useLanguage, languages } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const tabs = [
  { to: '/',          icon: Home,            labelKey: 'nav.home' },
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/forecast',  icon: TrendingUp,      labelKey: 'nav.forecast' },
  { to: '/aurora',    icon: Sparkles,        labelKey: 'nav.aurora' },
];

const moreRoutes = ['/alerts', '/mood', '/uv', '/sun', '/sky', '/iss', '/magnetic-effects', '/faq', '/profile', '/settings'];

const BottomTabBar = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (moreOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = parseInt(document.body.style.top || '0', 10);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, -scrollY);
    }
    return () => {
      const scrollY = parseInt(document.body.style.top || '0', 10);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) window.scrollTo(0, -scrollY);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moreOpen]);

  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isMoreActive = moreRoutes.some(r => location.pathname === r);

  const handleNav = (to: string) => {
    setMoreOpen(false);
    navigate(to);
  };

  const handleLogout = async () => {
    setMoreOpen(false);
    await signOut();
    navigate('/');
  };

  const moreLinks = [
    { to: '/alerts',           icon: AlertTriangle, label: t('nav.alerts') },
    { to: '/mood',             icon: SmilePlus,     label: t('nav.mood') },
    { to: '/uv',               icon: Sun,           label: t('nav.uv') || 'UV Index' },
    { to: '/sun',              icon: Sun,           label: t('nav.sun') || 'Sun Times' },
    { to: '/sky',              icon: Eye,           label: t('nav.sky') || 'Sky Tonight' },
    { to: '/iss',              icon: Satellite,     label: t('nav.iss') || 'ISS Tracker' },
    { to: '/magnetic-effects', icon: Magnet,        label: t('nav.magneticEffects') || 'Magnetic Effects' },
    { to: '/faq',              icon: HelpCircle,    label: t('nav.faq') || 'FAQ' },
  ];

  return (
    <>
      {/* Material You bottom nav bar — full width, blurred surface */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 glass-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        <div className="flex items-center h-16">
          {tabs.map(({ to, icon: Icon, labelKey }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative"
              >
                {/* Active pill indicator around icon only */}
                <div className={`flex items-center justify-center w-16 h-8 rounded-full transition-all duration-200 ${
                  active ? 'bg-[#10b981]/20' : ''
                }`}>
                  <Icon
                    className={active ? 'text-[#10b981]' : 'text-white/60'}
                    size={22}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </div>
                <span className={`text-[10px] leading-none ${
                  active ? 'font-medium text-[#10b981]' : 'text-white/50'
                }`}>
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Open more menu"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className="flex flex-col items-center justify-center flex-1 h-full gap-1"
          >
            <div className={`flex items-center justify-center w-16 h-8 rounded-full transition-all duration-200 ${
              isMoreActive ? 'bg-[#10b981]/20' : ''
            }`}>
              <MoreHorizontal
                className={isMoreActive ? 'text-[#10b981]' : 'text-white/60'}
                size={22}
                strokeWidth={isMoreActive ? 2.5 : 1.8}
              />
            </div>
            <span className={`text-[10px] leading-none ${
              isMoreActive ? 'font-medium text-[#10b981]' : 'text-white/50'
            }`}>
              {t('nav.more') || 'More'}
            </span>
          </button>
        </div>
      </nav>

      {/* More bottom sheet — Material 3 style */}
      {moreOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[60] bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl overflow-hidden glass-surface"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-white font-medium text-base">{t('nav.more') || 'More'}</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 rounded-full flex items-center justify-center active:bg-white/10"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto" role="menu">
              {/* Navigation links */}
              <div className="py-1">
                {moreLinks.map(({ to, icon: Icon, label }) => {
                  const active = location.pathname === to;
                  return (
                    <button
                      key={to}
                      role="menuitem"
                      onClick={() => handleNav(to)}
                      className={`w-full flex items-center gap-4 px-4 py-3 active:bg-white/5 ${
                        active ? 'bg-[#10b981]/10' : ''
                      }`}
                    >
                      <Icon
                        className={active ? 'text-[#10b981]' : 'text-white/70'}
                        size={22}
                        strokeWidth={1.8}
                      />
                      <span className={`text-sm ${active ? 'text-[#10b981] font-medium' : 'text-white/90'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-white/8 mx-0" />

              {/* Settings */}
              <div className="py-1">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5"
                >
                  <span className="text-lg leading-none w-[22px] text-center">
                    {theme === 'dark' ? '🌙' : '☀️'}
                  </span>
                  <span className="text-sm text-white/90">
                    {theme === 'dark' ? t('nav.switchLight') : t('nav.switchDark')}
                  </span>
                </button>

                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5"
                >
                  <Globe className="text-white/70" size={22} strokeWidth={1.8} />
                  <span className="text-sm text-white/90">{t('nav.language')}</span>
                  <span className="ml-auto text-white/40 text-sm mr-1">
                    {languages.find(l => l.code === language)?.flag}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>

                {langOpen && (
                  <div className="bg-white/4 border-t border-white/6">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-3 pl-14 pr-4 py-2.5 active:bg-white/5 text-sm ${
                          language === lang.code ? 'text-[#10b981] font-medium' : 'text-white/60'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {language === lang.code && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-[#10b981]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-white/8" />

              {/* Account */}
              <div className="py-1">
                {user ? (
                  <>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#10b981]/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#10b981]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {profile?.full_name || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNav('/profile')}
                      className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5"
                    >
                      <User className="text-white/70" size={22} strokeWidth={1.8} />
                      <span className="text-sm text-white/90">{t('nav.profile') || 'Profile'}</span>
                    </button>

                    <button
                      onClick={() => handleNav('/settings')}
                      className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5"
                    >
                      <SlidersHorizontal className="text-white/70" size={22} strokeWidth={1.8} />
                      <span className="text-sm text-white/90">{t('nav.settings') || 'Settings'}</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-4 px-4 py-3 active:bg-white/5"
                    >
                      <LogOut className="text-red-400" size={22} strokeWidth={1.8} />
                      <span className="text-sm text-red-400">{t('auth.logout')}</span>
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3">
                    <button
                      onClick={() => handleNav('/auth')}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#10b981] text-white font-medium text-sm"
                    >
                      {t('auth.signIn')}
                    </button>
                  </div>
                )}
              </div>

              <div className="h-2" />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomTabBar;
