import { useState } from 'react';
import PageMeta from '../components/PageMeta';
import { ChevronDown, Zap, Sun, Eye, Sparkles, Wind, Moon, MapPin } from 'lucide-react';

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
  {
    category: 'Kp Index',
    icon: <Zap className="w-5 h-5 text-[#f97316]" />,
    question: 'What is the Kp index and what does it mean for aurora viewing?',
    answer: 'The Kp index (Planetarische Kennziffer) is a global 0–9 scale measuring disturbances in Earth\'s magnetic field, updated every 3 hours by NOAA. For aurora viewing, it indicates how far south the aurora oval expands: Kp 0–2 means activity is confined near the polar regions, while Kp 5+ (a geomagnetic storm) pushes the northern lights further south — potentially to Scotland, southern Canada, or even Central Europe during extreme events. The higher the Kp, the larger the area where aurora borealis tonight may be visible. Live Kp data is displayed on The Storm Watcher\'s Dashboard, updated every minute from the GFZ Potsdam and NOAA feeds.',
  },
  {
    category: 'Kp Index',
    icon: <Zap className="w-5 h-5 text-[#f97316]" />,
    question: 'What Kp level do I need to see the northern lights?',
    answer: 'The required Kp depends on your latitude. At 65°N (northern Scandinavia, Iceland, Alaska), Kp 1–2 is often enough. At 60°N (southern Norway, Helsinki, Anchorage), Kp 3–4 is typical. At 55°N (Scotland, Stockholm, southern Canada), you generally need Kp 5–6. At 50°N (central Germany, Prague, northern France), Kp 7–8 is required. These thresholds assume completely dark, clear skies — light pollution and cloud cover can prevent aurora sightings even when the northern lights forecast looks promising. Use The Storm Watcher\'s Aurora Visibility page for a prediction tailored to your exact coordinates.',
  },
  {
    category: 'Kp Index',
    icon: <Zap className="w-5 h-5 text-[#f97316]" />,
    question: 'What is the difference between Kp 5, Kp 7, and Kp 9?',
    answer: 'Kp 5 (G1 minor storm) is the entry-level geomagnetic storm threshold — aurora becomes visible in southern Scandinavia, Scotland, and northern Canada, often as a pale arc on the horizon. Kp 7 (G3 strong storm) is a significant event: the aurora expands vividly to Germany, the northern US, and much of the UK, bright enough to photograph with a smartphone. Kp 9 (G5 extreme storm) is the maximum possible level and is rare — the last major example was May 2024, when aurora was seen across Spain, Italy, Texas, and Florida. Each full Kp step pushes the aurora oval roughly 2–3° further toward the equator, so Kp 9 can bring a northern lights forecast to regions that haven\'t experienced it in decades.',
  },
  {
    category: 'Space Weather',
    icon: <Sun className="w-5 h-5 text-[#fbbf24]" />,
    question: 'What is a geomagnetic storm and how is it measured?',
    answer: 'A geomagnetic storm is a temporary, large-scale disturbance of Earth\'s magnetosphere caused by enhanced solar wind — typically following a coronal mass ejection (CME) or a high-speed solar wind stream from a coronal hole. NOAA classifies storms on the G-scale: G1 (minor, Kp 5), G2 (moderate, Kp 6), G3 (strong, Kp 7), G4 (severe, Kp 8), and G5 (extreme, Kp 9). Geomagnetic storms produce aurora at lower latitudes and can disrupt satellites, GPS accuracy, HF radio, and power grids. Scientists also use the Dst index, which tracks the weakening of Earth\'s magnetic field during the storm\'s main phase. A geomagnetic storm alert from The Storm Watcher means conditions are ripe for an aurora sighting.',
  },
  {
    category: 'Space Weather',
    icon: <Sun className="w-5 h-5 text-[#fbbf24]" />,
    question: 'What is an X-ray solar flare and what does it mean?',
    answer: 'Solar flares are intense bursts of radiation from the Sun\'s surface, classified by their peak X-ray output: A, B, C, M, and X (each letter is 10× stronger than the previous). C-class flares are minor; M-class flares can cause brief radio blackouts on the Sun-facing side of Earth; X-class flares are the most powerful and can trigger radiation storms and widespread HF radio blackouts. A flare alone doesn\'t guarantee aurora — what matters is whether the eruption is accompanied by an Earth-directed CME. The Storm Watcher\'s Dashboard shows real-time X-ray flux from NOAA\'s GOES satellite so you can watch flare events unfold live.',
  },
  {
    category: 'Space Weather',
    icon: <Sun className="w-5 h-5 text-[#fbbf24]" />,
    question: 'What is a CME (coronal mass ejection)?',
    answer: 'A coronal mass ejection is a massive eruption of magnetized plasma from the Sun\'s corona, releasing up to a billion tonnes of solar material at speeds of 250–3,000 km/s. When an Earth-directed CME arrives — typically 1–4 days after the eruption — it can compress Earth\'s magnetosphere, spike the Kp index rapidly, and trigger the most spectacular aurora events of the solar cycle. Unlike the steady solar wind, a CME delivers a sudden shock with a strongly southward Bz, which is exactly the combination that produces widespread northern lights. NOAA\'s DONKI database tracks every active CME, and The Storm Watcher integrates this data into its geomagnetic storm alert system.',
  },
  {
    category: 'Solar Wind',
    icon: <Wind className="w-5 h-5 text-[#3b82f6]" />,
    question: 'What is the Bz component and why does it matter for aurora?',
    answer: 'Bz is the north-south component of the Interplanetary Magnetic Field (IMF), measured by the DSCOVR and ACE satellites at the L1 Lagrange point about 1.5 million km sunward of Earth. When Bz is negative (southward), Earth\'s magnetic field and the IMF become aligned in a configuration called magnetic reconnection, allowing charged solar particles to stream along field lines into the polar atmosphere and produce aurora. A sustained Bz below –10 nT is a reliable real-time indicator of intensifying geomagnetic activity — often giving 15–45 minutes of advance warning before the Kp index rises. Monitoring Bz on The Storm Watcher\'s Dashboard is one of the most actionable signals for deciding whether to head outside for aurora viewing tonight.',
  },
  {
    category: 'Solar Wind',
    icon: <Wind className="w-5 h-5 text-[#3b82f6]" />,
    question: 'What is solar wind speed and how does it affect aurora?',
    answer: 'Solar wind is the continuous outflow of charged particles — mostly protons and electrons — from the Sun\'s corona, traveling at typical speeds of 300–500 km/s during quiet conditions. When solar wind speed exceeds 500 km/s it compresses Earth\'s magnetosphere and increases the energy transfer rate; above 700 km/s it is associated with strong geomagnetic activity and aurora. High-speed streams from coronal holes are a common source of recurring geomagnetic disturbances and are often predictable up to 27 days in advance (one solar rotation). The most powerful aurora events combine elevated solar wind speed with a strongly negative Bz — both factors are displayed live on The Storm Watcher\'s Dashboard.',
  },
  {
    category: 'Aurora Basics',
    icon: <Sparkles className="w-5 h-5 text-[#10b981]" />,
    question: 'What is the aurora oval?',
    answer: 'The aurora oval is a roughly ring-shaped zone around each magnetic pole where aurora is most consistently active, centered at approximately 65–70° geomagnetic latitude under quiet conditions. During geomagnetic storms the oval expands equatorward and brightens dramatically — a Kp 9 storm can push it all the way to the subtropics. The NOAA OVATION model provides a real-time estimate of the oval\'s location and intensity, which The Storm Watcher displays on its 3D aurora globe. Knowing where the oval sits relative to your location is the single most useful piece of information for an accurate northern lights forecast.',
  },
  {
    category: 'Aurora Basics',
    icon: <Sparkles className="w-5 h-5 text-[#10b981]" />,
    question: 'Why does the aurora appear green, red, or purple?',
    answer: 'Aurora colors are determined by which atmospheric gas is energized and at what altitude. Green — the most common color — comes from oxygen atoms at 100–150 km altitude, where atmospheric density allows frequent collisions. Red aurora originates from oxygen at higher altitudes (above 200 km), where atoms take longer to release their energy. Blue and purple hues come from nitrogen molecules at altitudes below 100 km. During intense geomagnetic storms multiple layers are energized simultaneously, producing the vivid multi-colored displays — green curtains topped with red and purple fringes — that became iconic during the G5 storm of May 2024.',
  },
  {
    category: 'Viewing Tips',
    icon: <Eye className="w-5 h-5 text-[#a855f7]" />,
    question: 'When is the best time of year to see the northern lights?',
    answer: 'The aurora borealis is active year-round, but visibility requires darkness — making September through March the prime season at most latitudes. The autumn and spring equinoxes (around September 22 and March 21) are statistically more active due to a favorable alignment of Earth\'s magnetic field with the solar wind, a phenomenon known as the Russell–McPherron effect. Summer is problematic at high latitudes because of the midnight sun — it never gets dark enough. For a northern lights forecast trip, October through February offers the best combination of long nights, reasonable temperatures, and elevated geomagnetic activity during Solar Cycle 25\'s maximum.',
  },
  {
    category: 'Viewing Tips',
    icon: <Eye className="w-5 h-5 text-[#a855f7]" />,
    question: 'What time of night is best for aurora viewing?',
    answer: 'Aurora activity peaks around local magnetic midnight — typically between 10 PM and 2 AM — when the field lines overhead connect most directly to the active auroral zone. Faint aurora can appear any time after astronomical twilight, but the most dynamic displays with rapid curtains and rays concentrate in this window. That said, strong geomagnetic storms can produce aurora at any hour. Setting a Kp threshold alert on The Storm Watcher means you\'ll be notified the moment conditions peak, so you can head out at precisely the right time rather than waiting outside all night.',
  },
  {
    category: 'Viewing Tips',
    icon: <Eye className="w-5 h-5 text-[#a855f7]" />,
    question: 'How do I get aurora alerts on my phone?',
    answer: 'The Storm Watcher offers free push notifications for geomagnetic storm alerts — set your Kp threshold in the Settings page (e.g., "alert me when Kp ≥ 5") and you\'ll be notified the moment NOAA data crosses that level. The alert includes current Kp, Bz, solar wind speed, and estimated cloud cover at your saved location, so you get a complete northern lights forecast in a single notification. For premium users, alerts can be sent via SMS and email as well. This is far more reliable than checking manually, since strong geomagnetic activity can develop within minutes of a CME\'s arrival.',
  },
  {
    category: 'Location Guides',
    icon: <MapPin className="w-5 h-5 text-[#10b981]" />,
    question: 'Can I see the aurora in Scotland / UK?',
    answer: 'Yes — Scotland is one of the best aurora destinations outside Scandinavia. The Scottish Highlands, Orkney, and Shetland sit at 57–60°N, where a Kp of 4–5 is typically enough for sightings on a clear, dark night. During stronger geomagnetic storms (Kp 6+), aurora is regularly visible across northern England and, at Kp 8+, even from southern England. The biggest challenge in the UK is cloud cover, not latitude — check The Storm Watcher\'s northern lights forecast alongside a cloud cover chart before driving to a dark-sky site. The darkest spots are Galloway Forest Dark Sky Park, the Cairngorms, and the Northumberland International Dark Sky Park in England.',
  },
  {
    category: 'Location Guides',
    icon: <MapPin className="w-5 h-5 text-[#10b981]" />,
    question: 'Can I see the aurora in Germany / Central Europe?',
    answer: 'Aurora sightings in Germany, Austria, Switzerland, Poland, and neighbouring countries are rarer but entirely possible during strong geomagnetic storms. At 47–54°N, a Kp of 7–8 is typically needed for a reliable sighting, and Kp 9 can bring aurora as far south as the Mediterranean — as dramatically demonstrated during the May 2024 G5 storm, when the northern lights were photographed across Germany, France, northern Italy, and even Spain. The key is to act fast: set a geomagnetic storm alert on The Storm Watcher, identify a dark-sky site within driving distance, and watch for a sustained negative Bz. Clear, moonless nights in autumn and winter give you the best odds.',
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
      <PageMeta
        title="Aurora FAQ — Northern Lights Guide | The Storm Watcher"
        description="Everything you need to know about the Northern Lights, Kp index, solar wind, and how to see the aurora. Expert answers to common space weather questions."
        path="/faq"
      >
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </PageMeta>

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
