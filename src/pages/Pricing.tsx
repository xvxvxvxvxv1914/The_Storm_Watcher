import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Pricing = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for casual space weather enthusiasts',
      features: [
        'Real-time Kp index',
        'Storm Score index',
        '3-day forecast',
        'Basic geomagnetic alerts',
        'Web access only',
        'Install as PWA',
      ],
      buttonText: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$4.99',
      period: 'per month',
      description: 'For serious aurora chasers and enthusiasts',
      features: [
        'Everything in Free',
        'Hourly forecasts up to 7 days',
        'Push notifications',
        'Aurora visibility map',
        'Aurora Calendar',
        'Community photo gallery',
        'Aurora Hunt gamification',
        'Feature voting priority',
      ],
      buttonText: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Premium',
      price: '$7.99',
      period: 'per month',
      description: 'For professionals and researchers',
      features: [
        'Everything in Pro',
        'AI chatbot assistant',
        'Livestream access',
        'Full Aurora oval map',
        '30+ day history',
      ],
      buttonText: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white/5 backdrop-blur-sm border rounded-2xl p-8 ${
                plan.highlighted
                  ? 'border-[#00ff88] ring-2 ring-[#00ff88]/20 md:scale-105'
                  : 'border-white/10'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00ff88] text-[#0a0a1a] text-sm font-semibold rounded-full">
                  {t('pricing.mostPopular')}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">/ {plan.period}</span>
                </div>
              </div>

              {plan.name === 'Free' && !user ? (
                <Link
                  to="/auth"
                  className={`block w-full py-3 px-6 rounded-lg font-semibold mb-8 text-center transition-all ${
                    plan.highlighted
                      ? 'bg-[#00ff88] text-[#0a0a1a] hover:bg-[#00e67a]'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              ) : (
                <button
                  disabled
                  className={`w-full py-3 px-6 rounded-lg font-semibold mb-8 cursor-not-allowed opacity-60 ${
                    plan.highlighted
                      ? 'bg-[#00ff88] text-[#0a0a1a]'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  {plan.buttonText}
                </button>
              )}

              <ul className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-[#00ff88]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#00ff88]" />
                    </div>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-4">{t('pricing.faqTitle')}</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-semibold mb-2">{t('pricing.faq1Q')}</h4>
                <p className="text-gray-400 text-sm">
                  {t('pricing.faq1A')}
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">{t('pricing.faq2Q')}</h4>
                <p className="text-gray-400 text-sm">
                  {t('pricing.faq2A')}
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">{t('pricing.faq3Q')}</h4>
                <p className="text-gray-400 text-sm">
                  {t('pricing.faq3A')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-4">{t('pricing.enterpriseTitle')}</h3>
            <p className="text-gray-400 mb-6">
              {t('pricing.enterpriseDesc')}
            </p>
            <ul className="space-y-2 text-gray-300 text-sm mb-6">
              <li>• {t('pricing.enterprise1')}</li>
              <li>• {t('pricing.enterprise2')}</li>
              <li>• {t('pricing.enterprise3')}</li>
              <li>• {t('pricing.enterprise4')}</li>
              <li>• {t('pricing.enterprise5')}</li>
            </ul>
            <button disabled className="w-full py-3 px-6 bg-[#8b5cf6] text-white rounded-lg font-semibold cursor-not-allowed opacity-60">
              {t('pricing.contactSales')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
