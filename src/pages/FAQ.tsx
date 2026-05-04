import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, Zap, Sun, Eye, Sparkles, Wind, Moon } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
  category: string;
}

const faqData: FaqItem[] = [
  {
    category: 'Aurora Basics',
    icon: <Sparkles className="w-5 h-5 text-[#10b981]" />,
    question: 'What is the Aurora Borealis (Northern Lights)?',
    answer: 'The Aurora Borealis, or Northern Lights, is a natural light display caused by charged particles from the Sun colliding with gases in Earth\'s atmosphere. When solar wind particles interact with oxygen and nitrogen molecules, they emit photons of light — creating the stunning green, purple, red, and blue curtains of light visible near the polar regions.',
  },
  {
    category: 'Aurora Basics',
    icon: <Sparkles className="w-5 h-5 text-[#10b981]" />,
    question: 'What is the difference between Aurora Borealis and Aurora Australis?',
    answer: 'Aurora Borealis (Northern Lights) occurs in the Northern Hemisphere, while Aurora Australis (Southern Lights) occurs in the Southern Hemisphere. Both are caused by the same solar phenomena — charged particles from the Sun interacting with Earth\'s magnetic field. They often appear simultaneously at both poles as mirror images.',
  },
  {
    category: 'Kp Index',
    icon: <Zap className="w-5 h-5 text-[#f97316]" />,
    question: 'What is the Kp Index and why does it matter?',
    answer: 'The Kp Index is a scale from 0 to 9 that measures global geomagnetic activity. A Kp of 0-1 means very quiet conditions, while Kp 5+ indicates a geomagnetic storm. For aurora hunters, a higher Kp means the aurora oval expands further from the poles, making the Northern Lights visible at lower latitudes. Kp 4+ is generally needed to see aurora in Northern Europe, and Kp 7+ can bring aurora as far south as Central Europe.',
  },
  {
    category: 'Kp Index',
    icon: <Zap className="w-5 h-5 text-[#f97316]" />,
    question: 'What Kp level do I need to see the aurora from my location?',
    answer: 'It depends on your latitude: Kp 2-3 for Northern Scandinavia, Iceland, and Alaska; Kp 4-5 for Southern Scandinavia, Scotland, and Southern Canada; Kp 6-7 for Northern Germany, Poland, and Northern US states; Kp 8-9 for Central Europe, Southern UK, and the US Midwest. Use our Aurora page\'s city visibility chart for precise predictions for your location.',
  },
  {
    category: 'Solar Wind',
    icon: <Wind className="w-5 h-5 text-[#3b82f6]" />,
    question: 'What is Bz and why is it important for aurora viewing?',
    answer: 'Bz refers to the north-south component of the Interplanetary Magnetic Field (IMF). When Bz turns negative (southward), it means Earth\'s magnetic field can connect with the solar wind\'s magnetic field, allowing charged particles to enter our atmosphere and create aurora. A strongly negative Bz (below -10 nT) often produces spectacular aurora displays, even when the Kp index alone might not suggest strong activity.',
  },
  {
    category: 'Solar Wind',
    icon: <Wind className="w-5 h-5 text-[#3b82f6]" />,
    question: 'What is solar wind and how does it affect Earth?',
    answer: 'Solar wind is a continuous stream of charged particles (mainly protons and electrons) flowing from the Sun at speeds of 300-800 km/s. When solar wind speed increases above 500 km/s and density rises, it compresses Earth\'s magnetosphere, potentially triggering geomagnetic storms and aurora. Coronal Mass Ejections (CMEs) — massive bursts of solar wind — can cause the most dramatic aurora events.',
  },
  {
    category: 'Viewing Tips',
    icon: <Eye className="w-5 h-5 text-[#a855f7]" />,
    question: 'What are the best conditions for seeing the Northern Lights?',
    answer: 'For the best aurora viewing: (1) Dark skies — get away from city lights, (2) Clear skies — cloud cover below 30%, (3) Active geomagnetic conditions — Kp 4+, (4) Dark moon — new moon or crescent phases are ideal, (5) Time — typically between 10 PM and 2 AM local time, (6) Season — September to March in the Northern Hemisphere. Our Aurora Visibility Checklist combines all these factors in real-time.',
  },
  {
    category: 'Viewing Tips',
    icon: <Eye className="w-5 h-5 text-[#a855f7]" />,
    question: 'How do I photograph the Northern Lights?',
    answer: 'Camera settings for aurora photography: (1) Use a tripod — exposures are 5-25 seconds, (2) Wide-angle lens, f/2.8 or faster, (3) ISO 1600-3200, (4) Shutter speed 8-15 seconds for sharp curtains, (5) Manual focus set to infinity, (6) Shoot in RAW for best post-processing flexibility. Smartphone tip: Modern phones like iPhone 15+ and Samsung S24+ have excellent night modes that can capture aurora automatically.',
  },
  {
    category: 'Space Weather',
    icon: <Sun className="w-5 h-5 text-[#fbbf24]" />,
    question: 'What is a geomagnetic storm?',
    answer: 'A geomagnetic storm is a major disturbance of Earth\'s magnetosphere caused by efficient energy exchange from solar wind into the space environment surrounding Earth. Storms are classified on a G1 (minor) to G5 (extreme) scale. G1-G2 storms produce aurora visible at high latitudes, while G3-G5 storms can push aurora to mid-latitudes and may affect power grids, satellite operations, and GPS accuracy.',
  },
  {
    category: 'Space Weather',
    icon: <Sun className="w-5 h-5 text-[#fbbf24]" />,
    question: 'What is the Solar Cycle and when is the best time for aurora?',
    answer: 'The Sun follows an approximately 11-year activity cycle. During Solar Maximum (the peak), sunspots, solar flares, and CMEs are most frequent, producing more geomagnetic storms and aurora. We are currently near Solar Cycle 25\'s maximum (2024-2026), making this one of the best periods for aurora hunting in over a decade. Activity should remain elevated through 2027.',
  },
  {
    category: 'Moon & Darkness',
    icon: <Moon className="w-5 h-5 text-[#94a3b8]" />,
    question: 'Does the Moon affect aurora visibility?',
    answer: 'Yes! A bright full moon washes out fainter aurora displays, similar to light pollution. The best aurora viewing occurs during new moon or within a few days of it, when skies are darkest. However, very strong aurora (Kp 7+) can be visible even under a full moon. Our Visibility Checklist automatically factors in the current moon phase.',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = [...new Set(faqData.map(f => f.category))];

  // JSON-LD structured data for Google rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen px-4 pt-32 pb-12 sm:pt-44 sm:pb-24 max-w-3xl mx-auto relative z-10">
      <Helmet>
        <title>Aurora FAQ — Northern Lights Guide | The Storm Watcher</title>
        <meta name="description" content="Everything you need to know about the Northern Lights, Kp index, solar wind, and how to see the aurora. Expert answers to common space weather questions." />
        <link rel="canonical" href="https://thestormwatcher.com/faq" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="text-center mb-6 md:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 uppercase tracking-wide">
          Aurora FAQ
        </h1>
        <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">
          Everything you need to know about the Northern Lights, space weather, and how to catch the aurora.
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-sm font-bold text-[#f97316] uppercase tracking-widest mb-4 flex items-center gap-2">
            {faqData.find(f => f.category === category)?.icon}
            {category}
          </h2>
          <div className="space-y-2">
            {faqData
              .map((faq, globalIndex) => ({ faq, globalIndex }))
              .filter(({ faq }) => faq.category === category)
              .map(({ faq, globalIndex }) => {
                const isOpen = openIndex === globalIndex;
                return (
                  <div
                    key={globalIndex}
                    className="glass-surface rounded-2xl border border-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-white font-medium text-sm sm:text-base pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-[#94a3b8] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <div className="h-px bg-white/10 mb-4" />
                        <p className="text-[#94a3b8] text-sm leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQ;
