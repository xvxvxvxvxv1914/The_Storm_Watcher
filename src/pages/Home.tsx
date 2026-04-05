import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Bell, Satellite } from 'lucide-react';
import { getKpIndex, getStormStatus } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

const Home = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const data = await getKpIndex();
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          setKpValue(latest.kp_index || latest.estimated_kp || 0);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching Kp index:', error);
        setLoading(false);
      }
    };

    fetchKp();
    const interval = setInterval(fetchKp, 60000);
    return () => clearInterval(interval);
  }, []);

  const stormStatus = kpValue !== null ? getStormStatus(kpValue) : null;
  const isPulsing = kpValue !== null && kpValue >= 7;

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] via-[#0a0a1a] to-[#3b82f6] opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#00ff88]/20 via-transparent to-[#8b5cf6]/20 animate-pulse"></div>

        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-48">
          <div className="text-center">
            <h1 className="text-5xl sm:text-7xl font-bold text-white mb-8">
              The Storm Watcher
            </h1>

            {loading ? (
              <div className="inline-block w-32 h-32 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin mb-6"></div>
            ) : (
              <div className="mb-8">
                <div className={`inline-block ${isPulsing ? 'animate-pulse' : ''}`}>
                  <div className="text-8xl sm:text-9xl font-bold text-[#00ff88] mb-4">
                    {kpValue?.toFixed(1) || '0.0'}
                  </div>
                </div>

                {stormStatus && (
                  <div className={`inline-block px-6 py-3 rounded-full ${stormStatus.bgColor} ${stormStatus.color} font-semibold text-lg ${isPulsing ? 'animate-pulse' : ''}`}>
                    {stormStatus.status}
                  </div>
                )}
              </div>
            )}

            <p className="text-xl sm:text-2xl text-gray-300 mb-12">
              {t('home.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-[#00ff88] text-[#0a0a1a] rounded-lg font-semibold hover:bg-[#00ff88]/90 transition-colors"
              >
                {t('home.hero.cta')}
              </Link>
              <Link
                to="/alerts"
                className="px-8 py-4 bg-white/10 text-white rounded-lg font-semibold backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
              >
                {t('nav.alerts')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-[#00ff88]/20 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-[#00ff88]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('home.feature1.title')}</h3>
            <p className="text-gray-400">
              {t('home.feature1.desc')}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-[#8b5cf6]/20 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-[#8b5cf6]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('home.feature2.title')}</h3>
            <p className="text-gray-400">
              {t('home.feature2.desc')}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-[#3b82f6]/20 rounded-lg flex items-center justify-center mb-4">
              <Satellite className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('home.feature3.title')}</h3>
            <p className="text-gray-400">
              {t('home.feature3.desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
