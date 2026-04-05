import { Check } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for casual space weather enthusiasts',
      features: [
        'Live Kp index monitoring',
        'Basic dashboard access',
        'Aurora forecast map',
        'Daily email alerts',
        'Community support',
      ],
      buttonText: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$2.99',
      period: 'per month',
      description: 'For serious aurora chasers and enthusiasts',
      features: [
        'Everything in Free',
        'Push notifications',
        'Email alerts for all events',
        'Historical data (30 days)',
        'No advertisements',
        'Priority support',
        'Advanced charts',
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
        'Full API access',
        'Historical data (1 year)',
        'Custom alert thresholds',
        'Priority email support',
        'Export data to CSV',
        'White-label options',
        'Early access to features',
      ],
      buttonText: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get real-time space weather alerts and aurora forecasts. Upgrade anytime to unlock more features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white/5 backdrop-blur-sm border rounded-2xl p-8 ${
                plan.highlighted
                  ? 'border-[#00ff88] ring-2 ring-[#00ff88]/20 scale-105'
                  : 'border-white/10'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00ff88] text-[#0a0a1a] text-sm font-semibold rounded-full">
                  Most Popular
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

              <button
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors mb-8 ${
                  plan.highlighted
                    ? 'bg-[#00ff88] text-[#0a0a1a] hover:bg-[#00ff88]/90'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                {plan.buttonText}
              </button>

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
            <h3 className="text-2xl font-semibold text-white mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-semibold mb-2">Can I change plans later?</h4>
                <p className="text-gray-400 text-sm">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Is there a free trial?</h4>
                <p className="text-gray-400 text-sm">
                  Pro plans come with a 14-day free trial. No credit card required.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">What payment methods do you accept?</h4>
                <p className="text-gray-400 text-sm">
                  We accept all major credit cards, PayPal, and Apple Pay.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-4">Enterprise Solutions</h3>
            <p className="text-gray-400 mb-6">
              Need custom solutions for your organization? We offer tailored plans for research institutions,
              observatories, and enterprise clients.
            </p>
            <ul className="space-y-2 text-gray-300 text-sm mb-6">
              <li>• Custom data integrations</li>
              <li>• Dedicated API endpoints</li>
              <li>• SLA guarantees</li>
              <li>• On-premise deployment options</li>
              <li>• Custom training and support</li>
            </ul>
            <button className="w-full py-3 px-6 bg-[#8b5cf6] text-white rounded-lg font-semibold hover:bg-[#8b5cf6]/90 transition-colors">
              Contact Enterprise Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
