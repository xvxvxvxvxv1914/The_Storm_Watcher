import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, TrendingUp, Sparkles, MoreHorizontal,
  X, Sun, Eye, Satellite, AlertTriangle, SmilePlus,
  User, LogOut, SlidersHorizontal, Globe, ChevronRight,
  Magnet, HelpCircle, Camera, Trophy, Video, CalendarDays,
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

const moreRoutes = ['/alerts', '/mood', '/uv', '/sun', '/sky', '/iss', '/magnetic-effects', '/faq', '/profile', '/settings', '/gallery', '/hunt', '/livestream', '/calendar'];

const BottomTabBar = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (moreOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => { document.documentElement.style.overflow = ''; };
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
    { to: '/alerts',           icon: AlertTriangle, label: t('nav.alerts'),                          badge: 'bg-red-500' },
    { to: '/gallery',          icon: Camera,        label: t('nav.gallery') || 'Gallery',            badge: 'bg-violet-500' },
    { to: '/hunt',             icon: Trophy,        label: t('nav.hunt') || 'Aurora Hunt',           badge: 'bg-amber-600' },
    { to: '/livestream',       icon: Video,         label: t('nav.livestream') || 'Livestream',      badge: 'bg-pink-600' },
    { to: '/calendar',         icon: CalendarDays,  label: t('nav.calendar') || 'Aurora Calendar',   badge: 'bg-emerald-600' },
    { to: '/mood',             icon: SmilePlus,     label: t('nav.mood'),                            badge: 'bg-purple-500' },
    { to: '/uv',               icon: Sun,           label: t('nav.uv') || 'UV Index',                badge: 'bg-amber-500' },
    { to: '/sun',              icon: Sun,           label: t('nav.sun') || 'Sun Times',              badge: 'bg-orange-500' },
    { to: '/sky',              icon: Eye,           label: t('nav.sky') || 'Sky Tonight',            badge: 'bg-sky-500' },
    { to: '/iss',              icon: Satellite,     label: t('nav.iss') || 'ISS Tracker',            badge: 'bg-indigo-500' },
    { to: '/magnetic-effects', icon: Magnet,        label: t('nav.magneticEffects') || 'Magnetic',   badge: 'bg-teal-600' },
    { to: '/faq',              icon: HelpCircle,    label: t('nav.faq') || 'FAQ',                    badge: 'bg-slate-500' },
  ];

  return (
    <>
      {/* Floating pill tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        aria-label="Main navigation"
      >
        <div
          className="pointer-events-auto flex items-center"
          style={{
            background: theme === 'light' ? 'rgba(242,242,247,0.82)' : 'rgba(18,18,30,0.82)',
            backdropFilter: 'blur(10px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
            border: theme === 'light' ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)',
            borderRadius: 100,
            boxShadow: theme === 'light'
              ? '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)'
              : '0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            padding: '6px 8px',
            gap: 0,
          }}
        >
          {tabs.map(({ to, icon: Icon, labelKey }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center py-1.5 gap-0.5"
                style={{ minWidth: 64, borderRadius: 80 }}
              >
                <Icon
                  className={active ? 'text-[#10b981]' : theme === 'light' ? 'text-slate-400' : 'text-[#4a5568]'}
                  size={24}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] ${active ? 'font-bold text-[#10b981]' : theme === 'light' ? 'font-medium text-slate-400' : 'font-medium text-[#4a5568]'}`}>
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
            className="flex flex-col items-center py-1.5 gap-0.5"
            style={{ minWidth: 64 }}
          >
            <MoreHorizontal
              className={isMoreActive ? 'text-[#10b981]' : theme === 'light' ? 'text-slate-400' : 'text-[#4a5568]'}
              size={24}
              strokeWidth={isMoreActive ? 2.5 : 1.8}
            />
            <span className={`text-[10px] ${isMoreActive ? 'font-bold text-[#10b981]' : theme === 'light' ? 'font-medium text-slate-400' : 'font-medium text-[#4a5568]'}`}>
              {t('nav.more') || 'More'}
            </span>
          </button>
        </div>
      </nav>


      {/* More bottom sheet */}
      {moreOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[60] bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-[20px] overflow-hidden glass-surface bottom-sheet-enter"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-white/25" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3">
              <span className={`font-bold text-lg ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{t('nav.more') || 'More'}</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close menu" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <X className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-white/70'}`} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto" role="menu">
              <div className="px-4 space-y-0.5 pb-2">
                {moreLinks.map(({ to, icon: Icon, label, badge }) => (
                  <button
                    key={to}
                    role="menuitem"
                    onClick={() => handleNav(to)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${location.pathname === to ? 'bg-white/8' : ''}`}
                  >
                    <span className={`w-8 h-8 rounded-xl ${badge} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                    </span>
                    <span className={location.pathname === to ? 'text-[#10b981]' : theme === 'light' ? 'text-slate-700' : 'text-white'}>{label}</span>
                    <ChevronRight className={`w-4 h-4 ml-auto ${theme === 'light' ? 'text-slate-400' : 'text-white/25'}`} />
                  </button>
                ))}
              </div>

              <div className="border-t border-white/8 mx-4 my-1" />

              <div className="px-4 space-y-0.5 py-2">
                <button
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? t('nav.switchLight') : t('nav.switchDark')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 text-base leading-none">
                    {theme === 'dark' ? '🌙' : '☀️'}
                  </span>
                  <span className={theme === 'light' ? 'text-slate-700' : 'text-white'}>{theme === 'dark' ? t('nav.switchLight') : t('nav.switchDark')}</span>
                </button>

                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-white" strokeWidth={2} />
                  </span>
                  <span className={theme === 'light' ? 'text-slate-700' : 'text-white'}>{t('nav.language')}</span>
                  <span className={`ml-auto text-sm ${theme === 'light' ? 'text-slate-400' : 'text-white/50'}`}>{languages.find(l => l.code === language)?.flag}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${theme === 'light' ? 'text-slate-400' : 'text-white/25'} ${langOpen ? 'rotate-90' : ''}`} />
                </button>

                {langOpen && (
                  <div className="ml-11 space-y-0.5">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          language === lang.code ? 'text-[#10b981] font-semibold' : theme === 'light' ? 'text-slate-500' : 'text-white/60'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {language === lang.code && <span className="ml-auto w-2 h-2 rounded-full bg-[#10b981]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/8 mx-4 my-1" />

              <div className="px-4 space-y-0.5 py-2">
                {user ? (
                  <>
                    <div className="px-3 py-2 mb-1">
                      <p className={`text-sm font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{profile?.full_name || user.email?.split('@')[0]}</p>
                      <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleNav('/profile')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                    >
                      <span className="w-8 h-8 rounded-xl bg-gray-500 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" strokeWidth={2} />
                      </span>
                      <span className={theme === 'light' ? 'text-slate-700' : 'text-white'}>{t('nav.profile') || 'Profile'}</span>
                      <ChevronRight className={`w-4 h-4 ml-auto ${theme === 'light' ? 'text-slate-400' : 'text-white/25'}`} />
                    </button>
                    <button
                      onClick={() => handleNav('/settings')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                    >
                      <span className="w-8 h-8 rounded-xl bg-gray-600 flex items-center justify-center shrink-0">
                        <SlidersHorizontal className="w-4 h-4 text-white" strokeWidth={2} />
                      </span>
                      <span className={theme === 'light' ? 'text-slate-700' : 'text-white'}>{t('nav.settings') || 'Settings'}</span>
                      <ChevronRight className={`w-4 h-4 ml-auto ${theme === 'light' ? 'text-slate-400' : 'text-white/25'}`} />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                    >
                      <span className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4 text-red-400" strokeWidth={2} />
                      </span>
                      <span className="text-red-400">{t('auth.logout')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleNav('/auth')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#10b981] text-white font-semibold text-sm"
                  >
                    {t('auth.signIn')}
                  </button>
                )}
              </div>

              <div className="h-3" />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomTabBar;
