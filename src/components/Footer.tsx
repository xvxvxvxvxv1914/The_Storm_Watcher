import { Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const Footer = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const navGroups = [
    {
      heading: t('footer.section.spaceWeather'),
      links: [
        { to: '/',          label: t('nav.home') },
        { to: '/dashboard', label: t('nav.dashboard') },
        { to: '/forecast',  label: t('nav.forecast') },
        { to: '/alerts',    label: t('nav.alerts') },
      ],
    },
    {
      heading: t('footer.section.skyObservation'),
      links: [
        { to: '/aurora',          label: t('nav.aurora') },
        { to: '/aurora-map',      label: t('nav.auroraMap') || 'Aurora Map' },
        { to: '/iss',             label: t('nav.iss') },
        { to: '/calendar',        label: t('nav.calendar') },
        { to: '/log',             label: 'Aurora Log' },
        { to: '/sky',             label: t('nav.sky') },
        { to: '/sun',             label: t('nav.sun') },
        { to: '/uv',              label: t('nav.uv') },
      ],
    },
    {
      heading: t('footer.section.healthInfo'),
      links: [
        { to: '/blog',             label: 'Blog' },
        { to: '/gallery',          label: t('nav.gallery') },
        { to: '/hunt',             label: t('nav.hunt') },
        { to: '/livestream',       label: t('nav.livestream') },
        { to: '/mood',             label: t('nav.mood') },
        { to: '/magnetic-effects', label: t('nav.magneticEffects') },
        { to: '/faq',              label: t('nav.faq') },
        { to: '/about',            label: t('nav.about') },
        { to: '/contact',          label: t('footer.contact') || 'Contact' },
      ],
    },
  ];

  return (
    <footer className="relative glass-surface border-t border-white/10 mt-16 pb-20 lg:pb-0" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Mobile: compact */}
        <div className="lg:hidden py-5">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-4">
            <img src="/logos/icon.svg" alt="The Storm Watcher" className="w-9 h-9 shrink-0" />
            <span className="text-white font-bold text-sm gradient-solar">The Storm Watcher</span>
          </div>

          {/* 2-column link grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                {t('footer.section.spaceWeather')}
              </p>
              <ul className="space-y-2">
                {[
                  { to: '/',          label: t('nav.home') },
                  { to: '/dashboard', label: t('nav.dashboard') },
                  { to: '/forecast',  label: t('nav.forecast') },
                  { to: '/alerts',    label: t('nav.alerts') },
                  { to: '/aurora',    label: t('nav.aurora') },
                ].map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[#64748b] text-xs hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                {t('footer.section.more')}
              </p>
              <ul className="space-y-2">
                {[
                  { to: '/iss',              label: t('nav.iss') },
                  { to: '/calendar',         label: t('nav.calendar') },
                  { to: '/sky',              label: t('nav.sky') },
                  { to: '/sun',              label: t('nav.sun') },
                  { to: '/uv',               label: t('nav.uv') },
                  { to: '/mood',             label: t('nav.mood') },
                  { to: '/magnetic-effects', label: t('nav.magneticEffectsShort') },
                  { to: '/blog',             label: 'Blog' },
                  { to: '/faq',              label: t('nav.faq') },
                  { to: '/about',            label: t('nav.about') },
                  { to: '/contact',          label: t('footer.contact') || 'Contact' },
                ].map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[#64748b] text-xs hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/8 pt-3 flex flex-col gap-1">
            <p className="text-[#475569] text-xs">© {new Date().getFullYear()} The Storm Watcher</p>
            <p className="text-[#374151] text-xs">
              Data:{' '}
              <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-[#64748b] underline">NOAA SWPC</a>
              {' · '}
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#64748b] underline">Open-Meteo</a>
            </p>
            <p className="text-[#64748b] text-xs flex items-center gap-3">
              <Link to="/privacy" className="hover:text-white underline inline-flex items-center min-h-[24px] py-1">{t('footer.privacy')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms" className="hover:text-white underline inline-flex items-center min-h-[24px] py-1">{t('footer.terms')}</Link>
            </p>
          </div>
        </div>

        {/* Desktop: full grid */}
        <div className="hidden lg:block py-12">
          <div className="grid grid-cols-5 gap-10 mb-10">
            <div className="col-span-2">
              <div className="flex items-center mb-4">
                <img
                  src={theme === 'light' ? '/logos/logo-transparent-dark.png' : '/logos/logo-transparent.png'}
                  alt="The Storm Watcher"
                  className="h-14 w-auto"
                />
              </div>
              <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
                {t('footer.description')}
              </p>
              <div className="space-y-2">
                <Link
                  to="/contact"
                  className="flex items-center gap-2 text-[#10b981] text-sm font-semibold hover:text-[#34d399] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('footer.contact') || 'Contact us'}
                </Link>
                <a
                  href="mailto:contact@thestormwatcher.com"
                  className="flex items-center gap-2 text-[#94a3b8] text-sm hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  contact@thestormwatcher.com
                </a>
                <a
                  href="mailto:support@thestormwatcher.com"
                  className="flex items-center gap-2 text-sm text-[#a78bfa] hover:text-white transition-colors"
                  title={t('footer.premiumSupport') || 'Priority support for Premium subscribers'}
                >
                  <Mail className="w-4 h-4" />
                  support@thestormwatcher.com
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7c3aed]/20 text-[#a78bfa]">Premium</span>
                </a>
                <a
                  href="mailto:partnerships@thestormwatcher.com"
                  className="flex items-center gap-2 text-[#94a3b8] text-sm hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  partnerships@thestormwatcher.com
                </a>
              </div>
            </div>

            {navGroups.map(group => (
              <div key={group.heading}>
                <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">{group.heading}</h3>
                <ul className="space-y-2">
                  {group.links.map(link => (
                    <li key={link.to}>
                      <Link to={link.to} className="text-[#94a3b8] text-sm hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col items-center gap-2">
            <p className="text-center text-[#94a3b8] text-sm">
              © {new Date().getFullYear()} The Storm Watcher. All rights reserved.
            </p>
            <p className="text-center text-[#475569] text-xs">
              Data powered by{' '}
              <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-[#94a3b8] transition-colors underline">NOAA SWPC</a>
              {' · '}
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#94a3b8] transition-colors underline">Open-Meteo</a>
            </p>
            <p className="text-center text-[#64748b] text-xs flex gap-3">
              <Link to="/privacy" className="hover:text-white transition-colors underline">{t('footer.privacyPolicy')}</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-white transition-colors underline">{t('footer.termsOfService')}</Link>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
