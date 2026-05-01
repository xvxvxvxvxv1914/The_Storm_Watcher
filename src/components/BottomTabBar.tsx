import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, TrendingUp, Sparkles, MoreHorizontal,
  X, Sun, Eye, Satellite, AlertTriangle, SmilePlus,
  User, LogOut, SlidersHorizontal, Globe, ChevronRight,
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

const moreRoutes = ['/alerts', '/mood', '/uv', '/sun', '/sky', '/iss', '/profile', '/settings'];

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
    { to: '/alerts', icon: AlertTriangle, label: t('nav.alerts'),          badge: 'bg-red-500' },
    { to: '/mood',   icon: SmilePlus,     label: t('nav.mood'),            badge: 'bg-purple-500' },
    { to: '/uv',     icon: Sun,           label: t('nav.uv') || 'UV Index', badge: 'bg-amber-500' },
    { to: '/sun',    icon: Sun,           label: t('nav.sun') || 'Sun Times', badge: 'bg-orange-500' },
    { to: '/sky',    icon: Eye,           label: t('nav.sky') || 'Sky Tonight', badge: 'bg-sky-500' },
    { to: '/iss',    icon: Satellite,     label: t('nav.iss') || 'ISS Tracker', badge: 'bg-indigo-500' },
  ];

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(10, 10, 26, 0.95)', backdropFilter: 'blur(20px)' }}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch">
          {tabs.map(({ to, icon: Icon, labelKey }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center flex-1 pt-2 pb-1 gap-0.5"
              >
                <div className={`flex items-center justify-center w-10 h-7 rounded-xl ${active ? 'bg-[#10b981]/15' : ''}`}>
                  <Icon
                    className={active ? 'text-[#10b981]' : 'text-[#64748b]'}
                    size={22}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </div>
                <span className={`text-[10px] ${active ? 'font-bold text-[#10b981]' : 'font-medium text-[#64748b]'}`}>
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
            className="flex flex-col items-center justify-center flex-1 pt-2 pb-1 gap-0.5"
          >
            <div className={`flex items-center justify-center w-10 h-7 rounded-xl ${isMoreActive ? 'bg-[#10b981]/15' : ''}`}>
              <MoreHorizontal
                className={isMoreActive ? 'text-[#10b981]' : 'text-[#64748b]'}
                size={22}
                strokeWidth={isMoreActive ? 2.5 : 1.8}
              />
            </div>
            <span className={`text-[10px] ${isMoreActive ? 'font-bold text-[#10b981]' : 'font-medium text-[#64748b]'}`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-[60] bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-[20px] overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(18, 18, 32, 0.98)', backdropFilter: 'blur(30px)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-white/25" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3">
              <span className="text-white font-bold text-lg">More</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close menu" className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto" role="menu">
              {/* Navigation links with iOS Settings-style icon badges */}
              <div className="px-4 space-y-0.5 pb-2">
                {moreLinks.map(({ to, icon: Icon, label, badge }) => (
                  <button
                    key={to}
                    role="menuitem"
                    onClick={() => handleNav(to)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      location.pathname === to ? 'bg-white/8' : ''
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl ${badge} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                    </span>
                    <span className={location.pathname === to ? 'text-[#10b981]' : 'text-white'}>{label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-white/25" />
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-white/8 mx-4 my-1" />

              {/* Settings section */}
              <div className="px-4 space-y-0.5 py-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 text-base leading-none">
                    {theme === 'dark' ? '🌙' : '☀️'}
                  </span>
                  <span className="text-white">{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
                </button>

                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-white" strokeWidth={2} />
                  </span>
                  <span className="text-white">Language</span>
                  <span className="ml-auto text-white/50 text-sm">{languages.find(l => l.code === language)?.flag}</span>
                  <ChevronRight className={`w-4 h-4 text-white/25 ${langOpen ? 'rotate-90' : ''}`} />
                </button>

                {langOpen && (
                  <div className="ml-11 space-y-0.5">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          language === lang.code ? 'text-[#10b981] font-semibold' : 'text-white/60'
                        }`}
                      >
                        <span>{lang.flag}</span><span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-white/8 mx-4 my-1" />

              {/* User section */}
              <div className="px-4 space-y-0.5 py-2">
                {user ? (
                  <>
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-semibold text-white">{profile?.full_name || user.email?.split('@')[0]}</p>
                      <p className="text-xs text-white/40">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleNav('/profile')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                    >
                      <span className="w-8 h-8 rounded-xl bg-gray-500 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" strokeWidth={2} />
                      </span>
                      <span className="text-white">{t('nav.profile') || 'Profile'}</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-white/25" />
                    </button>
                    <button
                      onClick={() => handleNav('/settings')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                    >
                      <span className="w-8 h-8 rounded-xl bg-gray-600 flex items-center justify-center shrink-0">
                        <SlidersHorizontal className="w-4 h-4 text-white" strokeWidth={2} />
                      </span>
                      <span className="text-white">{t('nav.settings') || 'Settings'}</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-white/25" />
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
                    className="w-full flex items-center justify-center gap-2 mx-3 px-4 py-3 rounded-xl bg-[#10b981] text-white font-semibold text-sm"
                    style={{ width: 'calc(100% - 24px)' }}
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
