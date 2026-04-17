import { Mail, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/forecast', label: t('nav.forecast') },
    { to: '/aurora', label: t('nav.aurora') },
    { to: '/alerts', label: t('nav.alerts') },
    { to: '/mood', label: t('nav.mood') },
  ];

  return (
    <footer className="relative glass-surface border-t border-white/10 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Sun className="w-8 h-8 text-[#f97316]" />
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#f97316] opacity-20 blur-lg" />
              </div>
              <h3 className="text-white font-bold text-lg gradient-solar">The Storm Watcher</h3>
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.navigation')}</h3>
            <ul className="space-y-2">
              {navLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-[#94a3b8] text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.contact')}</h3>
            <a
              href="mailto:hello@thestormwatcher.com"
              className="flex items-center gap-2 text-[#94a3b8] text-sm hover:text-white transition-colors mb-6"
            >
              <Mail className="w-4 h-4" />
              hello@thestormwatcher.com
            </a>
          </div>
        </div>

        {/* Coming Soon — Mobile Apps */}
        <div className="border-t border-white/10 pt-8 mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#475569] mb-1">{t('footer.comingSoon')}</p>
          <p className="text-[#94a3b8] text-sm mb-5">{t('footer.mobileSoon')}</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="cursor-not-allowed opacity-50">
              <img
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                className="h-10 pointer-events-none select-none"
              />
            </div>
            <div className="cursor-not-allowed opacity-50">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                alt="Get it on Google Play"
                className="h-10 pointer-events-none select-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-[#94a3b8] text-sm">
            © 2026 The Storm Watcher. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
