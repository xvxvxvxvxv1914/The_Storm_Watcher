import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Video, ExternalLink, MonitorPlay, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Camera {
  id: string;
  name: string;
  org: string;
  location: string;
  country: string;
  flag: string;
  url: string;
  embedUrl?: string;
  description: string;
  tags: string[];
}

const CAMERAS: Camera[] = [
  {
    id: 'explore_arviat',
    name: 'Northern Lights Live',
    org: 'Explore.org',
    location: 'Arviat, Nunavut',
    country: 'Canada',
    flag: '🇨🇦',
    url: 'https://explore.org/livecams/arctic-and-northern-lights/northern-lights-camera-arviat',
    embedUrl: 'https://explore.org/livecams/arctic-and-northern-lights/northern-lights-camera-arviat',
    description: 'Live camera from the Canadian Arctic, optimized for aurora viewing.',
    tags: ['24/7', 'Sky Camera'],
  },
  {
    id: 'tromso_norway',
    name: 'Tromsø Sky Cam',
    org: 'Visit Tromsø',
    location: 'Tromsø',
    country: 'Norway',
    flag: '🇳🇴',
    url: 'https://www.visittromso.no/en/resources/webcams',
    description: 'Several webcams from Tromsø, the aurora capital of Norway.',
    tags: ['Multiple Cams', 'City + Sky'],
  },
  {
    id: 'iceland_vedur',
    name: 'Iceland Weather Cams',
    org: 'Veðurstofa Íslands',
    location: 'Iceland',
    country: 'Iceland',
    flag: '🇮🇸',
    url: 'https://www.vedur.is/vedur/myndir/',
    description: 'Network of official weather cameras across Iceland including northern regions.',
    tags: ['Weather Cams', 'National Grid'],
  },
  {
    id: 'svo_finland',
    name: 'Sodankylä Geophysical',
    org: 'SGO / Univ. of Oulu',
    location: 'Sodankylä, Lapland',
    country: 'Finland',
    flag: '🇫🇮',
    url: 'https://www.sgo.fi/Data/RealTime/realtime.php',
    description: 'Real-time all-sky camera from the Sodankylä Geophysical Observatory.',
    tags: ['All-Sky', 'Scientific'],
  },
  {
    id: 'auroramax',
    name: 'AuroraMAX',
    org: 'Canadian Space Agency',
    location: 'Yellowknife, NT',
    country: 'Canada',
    flag: '🇨🇦',
    url: 'https://www.asc-csa.gc.ca/eng/astronomy/auroramax/',
    description: 'High-definition aurora camera operated by the Canadian Space Agency.',
    tags: ['HD', 'All-Sky', 'Official'],
  },
  {
    id: 'kevo_finland',
    name: 'Kevo Subarctic Research',
    org: 'Univ. of Turku',
    location: 'Utsjoki, Lapland',
    country: 'Finland',
    flag: '🇫🇮',
    url: 'https://www.utu.fi/en/university/faculties/faculty-of-science/departments/department-of-biology/units/kevo-subarctic-research-institute',
    description: 'Research station above the Arctic Circle with sky observation equipment.',
    tags: ['Research', 'Arctic'],
  },
  {
    id: 'alta_norway',
    name: 'Alta Museum Cam',
    org: 'Alta Museum',
    location: 'Alta, Finnmark',
    country: 'Norway',
    flag: '🇳🇴',
    url: 'https://www.alta.no/en/experience/northern-lights-in-alta',
    description: 'Camera from Alta, one of the best aurora-viewing spots in northern Norway.',
    tags: ['Tourism', 'Aurora Zone'],
  },
  {
    id: 'swpc_noaa',
    name: 'NOAA POES Aurora',
    org: 'NOAA SWPC',
    location: 'Real-time Satellite',
    country: 'USA',
    flag: '🇺🇸',
    url: 'https://www.swpc.noaa.gov/products/aurora-3-day-forecast',
    description: 'NOAA real-time aurora oval model — the gold standard for aurora forecasting.',
    tags: ['Scientific', 'Real-time'],
  },
];

export default function Livestream() {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<Camera | null>(null);

  return (
    <div className="min-h-screen px-4 py-20 max-w-6xl mx-auto">
      <Helmet>
        <title>Aurora Livestream — The Storm Watcher</title>
        <meta name="description" content="Live aurora cameras from Norway, Iceland, Finland and Canada. Watch the northern lights in real time." />
        <link rel="canonical" href="https://thestormwatcher.com/livestream" />
      </Helmet>

      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 bg-gradient-to-br from-[#ec4899] to-[#be185d] rounded-2xl flex items-center justify-center flex-shrink-0">
          <Video className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{t('livestream.title') || 'Aurora Livestream'}</h1>
          <p className="text-[#94a3b8] mt-0.5">{t('livestream.subtitle') || 'Live cameras from the aurora zone'}</p>
        </div>
      </div>

      <p className="text-[#64748b] text-sm mb-8">
        {t('livestream.disclaimer') || 'Streams are provided by third-party organizations. Availability may vary. Click any camera to open it in a new tab.'}
      </p>

      {/* Featured player */}
      {featured && (
        <div className="glass-surface rounded-2xl border border-white/10 overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xl">{featured.flag}</span>
              <div>
                <p className="text-white font-semibold text-sm">{featured.name}</p>
                <p className="text-[#64748b] text-xs">{featured.org} · {featured.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={featured.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#94a3b8] text-xs hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('livestream.openExternal') || 'Open site'}
              </a>
              <button
                onClick={() => setFeatured(null)}
                className="text-[#64748b] hover:text-white transition-colors px-2 py-1.5 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="bg-black aspect-video flex items-center justify-center">
            {featured.embedUrl ? (
              <iframe
                src={featured.embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen"
                title={featured.name}
              />
            ) : (
              <div className="text-center px-8">
                <MonitorPlay className="w-16 h-16 text-[#334155] mx-auto mb-4" />
                <p className="text-[#64748b] text-sm mb-4">{t('livestream.noEmbed') || 'This source does not support direct embedding.'}</p>
                <a
                  href={featured.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#be185d] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('livestream.openSite') || 'Open in new tab'}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CAMERAS.map(cam => (
          <div
            key={cam.id}
            className="glass-surface rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{cam.flag}</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {cam.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#64748b] border border-white/5">{tag}</span>
                ))}
              </div>
            </div>

            <p className="text-white font-semibold text-sm mb-0.5 leading-tight">{cam.name}</p>
            <p className="text-[#64748b] text-xs mb-1">{cam.org}</p>
            <p className="text-[#94a3b8] text-xs mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3 flex-shrink-0" />
              {cam.location}, {cam.country}
            </p>
            <p className="text-[#475569] text-xs leading-relaxed flex-1">{cam.description}</p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setFeatured(cam)}
                className="flex-1 py-2 rounded-xl bg-[#ec4899]/10 border border-[#ec4899]/20 text-[#f472b6] text-xs font-semibold hover:bg-[#ec4899]/20 transition-colors"
              >
                <MonitorPlay className="w-3.5 h-3.5 inline mr-1" />
                {t('livestream.preview') || 'Preview'}
              </button>
              <a
                href={cam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl border border-white/10 text-[#94a3b8] text-xs font-semibold hover:text-white hover:bg-white/5 transition-colors text-center"
              >
                <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
                {t('livestream.open') || 'Open'}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 glass-surface rounded-2xl p-5 border border-white/10 text-center">
        <p className="text-[#64748b] text-sm">
          {t('livestream.tipTitle') || 'Tip:'}{' '}
          {t('livestream.tip') || 'Best aurora visibility occurs between 10 PM and 2 AM local time on clear, dark nights. Check the Dashboard for the current Kp index before heading out.'}
        </p>
      </div>
    </div>
  );
}
