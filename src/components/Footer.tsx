import { Mail, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
  const { t, language } = useLanguage();

  const isBg = language === 'bg';

  const navGroups = [
    {
      heading: isBg ? 'Космическо Време' : 'Space Weather',
      links: [
        { to: '/', label: t('nav.home') },
        { to: '/dashboard', label: t('nav.dashboard') },
        { to: '/forecast', label: t('nav.forecast') },
        { to: '/alerts', label: t('nav.alerts') },
      ],
    },
    {
      heading: isBg ? 'Наблюдение' : 'Sky & Observation',
      links: [
        { to: '/aurora', label: t('nav.aurora') },
        { to: '/iss', label: 'ISS Tracker' },
        { to: '/sky', label: 'Sky Visibility' },
        { to: '/sun', label: 'Sun Times' },
        { to: '/uv', label: 'UV Index' },
      ],
    },
    {
      heading: isBg ? 'Здраве & Информация' : 'Health & Info',
      links: [
        { to: '/mood', label: t('nav.mood') },
        { to: '/magnetic-effects', label: isBg ? 'Магнитни бури & Здраве' : 'Magnetic Storms & Health' },
        { to: '/faq', label: 'Aurora FAQ' },
      ],
    },
  ];

  return (
    <footer className="relative glass-surface border-t border-white/10 py-12 mt-16" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Sun className="w-8 h-8 text-[#f97316]" />
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#f97316] opacity-20 blur-lg" />
              </div>
              <h3 className="text-white font-bold text-lg gradient-solar">The Storm Watcher</h3>
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              {t('footer.description')}
            </p>
            <a
              href="mailto:hello@thestormwatcher.com"
              className="flex items-center gap-2 text-[#94a3b8] text-sm hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4" />
              hello@thestormwatcher.com
            </a>
          </div>

          {/* Nav groups */}
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
            Data powered by <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-[#94a3b8] transition-colors underline">NOAA SWPC</a> · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#94a3b8] transition-colors underline">Open-Meteo</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
