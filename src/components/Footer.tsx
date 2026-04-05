import { Github, Twitter, Mail, Sun } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="relative glass-surface border-t border-white/10 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Sun className="w-8 h-8 text-[#f97316]" />
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#f97316] opacity-20 blur-lg" />
              </div>
              <h3 className="text-white font-bold text-lg gradient-solar">The Storm Watcher</h3>
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider">{t('footer.company')}</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-[#f97316] text-sm transition-colors">
                  {t('footer.about')}
                </a>
              </li>
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-[#f97316] text-sm transition-colors">
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-[#f97316] text-sm transition-colors">
                  {t('footer.support')}
                </a>
              </li>
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-[#f97316] text-sm transition-colors">
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider">Connect</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 glass-surface rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#f97316] hover:glow-orange transition-all"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 glass-surface rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#f97316] hover:glow-orange transition-all"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 glass-surface rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#f97316] hover:glow-orange transition-all"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-[#94a3b8] text-sm">
            © 2026 The Storm Watcher. {t('footer.rights')}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
