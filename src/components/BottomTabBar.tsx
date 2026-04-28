import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, TrendingUp, Sparkles, MoreHorizontal,
  X, Bell, Sun, Eye, Satellite, AlertTriangle, SmilePlus,
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
    { to: '/alerts', icon: AlertTriangle, label: t('nav.alerts') },
    { to: '/mood',   icon: SmilePlus,     label: t('nav.mood') },
    { to: '/uv',     icon: Sun,           label: t('nav.uv') || 'UV Index' },
    { to: '/sun',    icon: Sun,           label: t('nav.sun') || 'Sun Times' },
    { to: '/sky',    icon: Eye,           label: t('nav.sky') || 'Sky Tonight' },
    { to: '/iss',    icon: Satellite,     label: t('nav.iss') || 'ISS Tracker' },
  ];

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8, 8, 20, 0.92)' }}
      >
        <div className="flex items-stretch">
          {tabs.map(({ to, icon: Icon, labelKey }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5"
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${active ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-semibold ${active ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}>
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5"
          >
            <MoreHorizontal
              className={`w-5 h-5 ${isMoreActive ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}
              strokeWidth={isMoreActive ? 2.5 : 1.8}
            />
            <span className={`text-[10px] font-semibold ${isMoreActive ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}>
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
            className="lg:hidden fixed inset-0 z-[60] bg-black/50"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-white/10 backdrop-blur-xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(12, 12, 26, 0.97)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <span className="text-white font-bold text-base">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-[#94a3b8] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
              {/* More nav links */}
              {moreLinks.map(({ to, icon: Icon, label }) => (
                <button
                  key={to}
                  onClick={() => handleNav(to)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? 'text-[#10b981] bg-[#10b981]/10'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-white/10 my-2" />

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
              >
                <span className="text-lg leading-none">{theme === 'dark' ? '🌙' : '☀️'}</span>
                {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              </button>

              {/* Language */}
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Globe className="w-5 h-5 shrink-0" />
                Language — {languages.find(l => l.code === language)?.flag}
                <ChevronRight className={`w-4 h-4 ml-auto opacity-40 transition-transform ${langOpen ? 'rotate-90' : ''}`} />
              </button>
              {langOpen && (
                <div className="ml-4 space-y-0.5">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        language === lang.code ? 'text-[#f97316]' : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <span>{lang.flag}</span><span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-white/10 my-2" />

              {/* User section */}
              {user ? (
                <>
                  <div className="px-4 py-2">
                    <p className="text-sm font-semibold text-white">{profile?.full_name || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-[#94a3b8]">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleNav('/profile')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <User className="w-5 h-5 shrink-0" />
                    {t('nav.profile') || 'Profile'}
                  </button>
                  <button
                    onClick={() => handleNav('/settings')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <SlidersHorizontal className="w-5 h-5 shrink-0" />
                    {t('nav.settings') || 'Settings'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {t('auth.logout')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleNav('/auth')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold text-sm"
                >
                  {t('auth.signIn')}
                </button>
              )}

              <div className="h-2" />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomTabBar;
