import { useState } from 'react';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { ChevronDown, Zap, Sun, Eye, Sparkles, Wind, Moon, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { faqContent } from '../content/faqContent';

// English faqData is the canonical source for icons and category keys
const faqData = [
  { category: 'Aurora Basics', icon: <Sparkles className="w-5 h-5 text-[#10b981]" /> },
  { category: 'Aurora Basics', icon: <Sparkles className="w-5 h-5 text-[#10b981]" /> },
  { category: 'Kp Index', icon: <Zap className="w-5 h-5 text-[#f97316]" /> },
  { category: 'Kp Index', icon: <Zap className="w-5 h-5 text-[#f97316]" /> },
  { category: 'Solar Wind', icon: <Wind className="w-5 h-5 text-[#3b82f6]" /> },
  { category: 'Solar Wind', icon: <Wind className="w-5 h-5 text-[#3b82f6]" /> },
  { category: 'Viewing Tips', icon: <Eye className="w-5 h-5 text-[#a855f7]" /> },
  { category: 'Viewing Tips', icon: <Eye className="w-5 h-5 text-[#a855f7]" /> },
  { category: 'Space Weather', icon: <Sun className="w-5 h-5 text-[#fbbf24]" /> },
  { category: 'Space Weather', icon: <Sun className="w-5 h-5 text-[#fbbf24]" /> },
  { category: 'Moon & Darkness', icon: <Moon className="w-5 h-5 text-[#94a3b8]" /> },
  { category: 'Kp Index', icon: <Zap className="w-5 h-5 text-[#f97316]" /> },
  { category: 'Kp Index', icon: <Zap className="w-5 h-5 text-[#f97316]" /> },
  { category: 'Kp Index', icon: <Zap className="w-5 h-5 text-[#f97316]" /> },
  { category: 'Space Weather', icon: <Sun className="w-5 h-5 text-[#fbbf24]" /> },
  { category: 'Space Weather', icon: <Sun className="w-5 h-5 text-[#fbbf24]" /> },
  { category: 'Space Weather', icon: <Sun className="w-5 h-5 text-[#fbbf24]" /> },
  { category: 'Solar Wind', icon: <Wind className="w-5 h-5 text-[#3b82f6]" /> },
  { category: 'Solar Wind', icon: <Wind className="w-5 h-5 text-[#3b82f6]" /> },
  { category: 'Aurora Basics', icon: <Sparkles className="w-5 h-5 text-[#10b981]" /> },
  { category: 'Aurora Basics', icon: <Sparkles className="w-5 h-5 text-[#10b981]" /> },
  { category: 'Viewing Tips', icon: <Eye className="w-5 h-5 text-[#a855f7]" /> },
  { category: 'Viewing Tips', icon: <Eye className="w-5 h-5 text-[#a855f7]" /> },
  { category: 'Viewing Tips', icon: <Eye className="w-5 h-5 text-[#a855f7]" /> },
  { category: 'Location Guides', icon: <MapPin className="w-5 h-5 text-[#10b981]" /> },
  { category: 'Location Guides', icon: <MapPin className="w-5 h-5 text-[#10b981]" /> },
];

const categoryIcons: Record<string, React.ReactNode> = {
  'Aurora Basics': <Sparkles className="w-5 h-5 text-[#10b981]" />,
  'Kp Index': <Zap className="w-5 h-5 text-[#f97316]" />,
  'Solar Wind': <Wind className="w-5 h-5 text-[#3b82f6]" />,
  'Viewing Tips': <Eye className="w-5 h-5 text-[#a855f7]" />,
  'Space Weather': <Sun className="w-5 h-5 text-[#fbbf24]" />,
  'Moon & Darkness': <Moon className="w-5 h-5 text-[#94a3b8]" />,
  'Location Guides': <MapPin className="w-5 h-5 text-[#10b981]" />,
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { language } = useLanguage();

  const langContent = faqContent[language] ?? faqContent['en'];
  const items = langContent.items;
  const categories = langContent.categories;

  // JSON-LD always in English for SEO
  const enItems = faqContent['en'].items;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: enItems.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  // Group by English category key (index in faqData) to preserve order
  const categoryKeys = [...new Set(faqData.map(f => f.category))];

  return (
    <div className="min-h-screen px-4 pt-32 pb-12 sm:pt-44 sm:pb-24 max-w-3xl mx-auto relative z-10">
      <PageMeta
        title="Aurora FAQ — Northern Lights Guide | The Storm Watcher"
        description="Everything you need to know about the Northern Lights, Kp index, solar wind, and how to see the aurora. Expert answers to common space weather questions."
        path="/faq"
      >
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </PageMeta>
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }]} />

      <div className="text-center mb-6 md:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 uppercase tracking-wide">
          Aurora FAQ
        </h1>
        <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">
          {langContent.subtitle}
        </p>
      </div>

      {categoryKeys.map(categoryKey => (
        <div key={categoryKey} className="mb-8">
          <h2 className="text-sm font-bold text-[#f97316] uppercase tracking-widest mb-4 flex items-center gap-2">
            {categoryIcons[categoryKey]}
            {categories[categoryKey] ?? categoryKey}
          </h2>
          <div className="space-y-2">
            {faqData
              .map((meta, globalIndex) => ({ meta, globalIndex }))
              .filter(({ meta }) => meta.category === categoryKey)
              .map(({ globalIndex }) => {
                const item = items[globalIndex];
                if (!item) return null;
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
                      <span className="text-white font-medium text-sm sm:text-base pr-4">{item.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-[#94a3b8] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <div className="h-px bg-white/10 mb-4" />
                        <p className="text-[#94a3b8] text-sm leading-relaxed">{item.answer}</p>
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
