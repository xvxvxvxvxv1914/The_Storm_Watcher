import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Home, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <Helmet>
        <title>404 — Lost in Space | The Storm Watcher</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <StarField />

      {/* Animated magnetic orb in background */}
      <div className="magnetic-orb" style={{ top: '-100px', right: '-200px' }} />
      <div className="solar-orb" style={{ bottom: '-150px', left: '-150px' }} />

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Big 404 number with aurora gradient */}
        <div className="relative mb-6">
          <div className="text-[180px] sm:text-[220px] font-bold leading-none gradient-aurora select-none opacity-20">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-[#10b981] animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 uppercase tracking-wide">
          {t('notFound.title')}
        </h1>

        <p className="text-[#94a3b8] text-lg mb-10 leading-relaxed">
          {t('notFound.description')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-xl font-bold uppercase tracking-wider hover:scale-105 transition-transform glow-green"
          >
            <Home className="w-5 h-5" />
            {t('notFound.backHome')}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-8 py-4 glass-surface text-white rounded-xl font-bold uppercase tracking-wider hover:scale-105 transition-transform border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('notFound.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
