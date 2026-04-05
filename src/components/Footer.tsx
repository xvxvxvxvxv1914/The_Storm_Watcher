import { Github, Twitter, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0a0a1a] border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-semibold mb-4">The Storm Watcher</h3>
            <p className="text-gray-400 text-sm">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.company')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">{t('footer.about')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">{t('footer.privacy')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">{t('footer.support')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">{t('footer.contact')}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-gray-400 text-sm">
            © 2026 The Storm Watcher. {t('footer.rights')}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
