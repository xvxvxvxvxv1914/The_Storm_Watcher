import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import PlanGuard from '../components/PlanGuard';
import { Video, ExternalLink, Globe, Youtube, CalendarClock, Radio, MapPin, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useKpLive } from '../hooks/useKpLive';

type CameraKind = 'youtube' | 'webcam';

interface Camera {
  id: string;
  name: string;
  org: string;
  location: string;
  country: string;
  flag: string;
  url: string;
  kind: CameraKind;
  description: string;
  tags: string[];
  seasonal?: string;
}

const CAMERAS: Camera[] = [
  // ─── YouTube live channels ───
  {
    id: 'auroramax_yt',
    name: 'AuroraMAX',
    org: 'Canadian Space Agency',
    location: 'Yellowknife, NT',
    country: 'Canada',
    flag: '🇨🇦',
    url: 'https://www.youtube.com/@AuroraMAXlive',
    kind: 'youtube',
    description: 'Official HD aurora cam from the Canadian Space Agency — broadcasts live during aurora season.',
    tags: ['HD', 'Official'],
    seasonal: 'Aug–May',
  },
  {
    id: 'explore_yt',
    name: 'Explore.org Aurora',
    org: 'Explore.org',
    location: 'Churchill / Arviat',
    country: 'Canada',
    flag: '🇨🇦',
    url: 'https://www.youtube.com/@exploreorg/streams',
    kind: 'youtube',
    description: 'Multi-camera Arctic feeds — Hudson Bay, Manitoba. Polar bears by day, aurora by night.',
    tags: ['Multi-cam', '24/7'],
  },
  {
    id: 'lol_yt',
    name: 'Lights Over Lapland',
    org: 'Lights Over Lapland',
    location: 'Abisko',
    country: 'Sweden',
    flag: '🇸🇪',
    url: 'https://www.youtube.com/@lightsoverlapland',
    kind: 'youtube',
    description: 'Live broadcasts from Abisko National Park, one of the best aurora-viewing spots on Earth.',
    tags: ['HD', 'Sweden'],
    seasonal: 'Sep–Mar',
  },
  {
    id: 'aurora_zone_yt',
    name: 'The Aurora Zone',
    org: 'The Aurora Zone',
    location: 'Lapland / Norway',
    country: 'UK/Nordics',
    flag: '🇬🇧',
    url: 'https://www.youtube.com/@theaurorazone',
    kind: 'youtube',
    description: 'Aurora travel specialists with frequent live broadcasts from Finnish and Norwegian Lapland.',
    tags: ['Travel', 'Live Events'],
    seasonal: 'Oct–Mar',
  },
  {
    id: 'spaceweathertv_yt',
    name: 'Space Weather TV',
    org: 'Space Weather TV',
    location: 'USA',
    country: 'USA',
    flag: '🇺🇸',
    url: 'https://www.youtube.com/@SpaceWeatherTV',
    kind: 'youtube',
    description: 'Space weather analysis and aurora event coverage — livestreams during major geomagnetic storms.',
    tags: ['Space Weather', 'Storms'],
  },

  // ─── External webcams ───
  {
    id: 'explore_arviat',
    name: 'Northern Lights Cam — Arviat',
    org: 'Explore.org',
    location: 'Arviat, Nunavut',
    country: 'Canada',
    flag: '🇨🇦',
    url: 'https://explore.org/livecams/arctic-and-northern-lights/northern-lights-camera-arviat',
    kind: 'webcam',
    description: 'Live camera from the Canadian Arctic, optimized for aurora viewing.',
    tags: ['24/7', 'Sky Camera'],
  },
  {
    id: 'tromso_norway',
    name: 'Tromsø Live Webcams',
    org: 'WebcamTaxi',
    location: 'Tromsø',
    country: 'Norway',
    flag: '🇳🇴',
    url: 'https://www.webcamtaxi.com/en/norway/troms/tromso.html',
    kind: 'webcam',
    description: 'Live webcams from Tromsø — the aurora capital of Norway. Sky and city views.',
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
    kind: 'webcam',
    description: 'Official network of weather cameras across Iceland including northern aurora regions.',
    tags: ['Weather Cams', 'National Grid'],
  },
  {
    id: 'fmi_aurora',
    name: 'FMI Aurora All-Sky Cameras',
    org: 'Finnish Meteorological Institute',
    location: 'Lapland, Finland',
    country: 'Finland',
    flag: '🇫🇮',
    url: 'https://aurorasnow.fmi.fi/public_service.php',
    kind: 'webcam',
    description: 'Real-time all-sky aurora cameras from multiple Finnish stations — Sodankylä, Muonio, Ivalo and more.',
    tags: ['All-Sky', 'Multi-station', 'Scientific'],
  },
  {
    id: 'kho_svalbard',
    name: 'Kjell Henriksen Observatory',
    org: 'UNIS / Univ. Centre in Svalbard',
    location: 'Svalbard',
    country: 'Norway',
    flag: '🇳🇴',
    url: 'https://kho.unis.no/',
    kind: 'webcam',
    description: 'Arctic all-sky cameras from 78°N — one of the northernmost aurora observatories in the world.',
    tags: ['All-Sky', '78°N', 'Scientific'],
    seasonal: 'Aug–Apr',
  },
  {
    id: 'swl_cams',
    name: 'Space Weather Live Cams',
    org: 'SpaceWeatherLive.com',
    location: 'Europe / Canada',
    country: 'Multi',
    flag: '🌍',
    url: 'https://www.spaceweatherlive.com/en/auroras/aurora-live-cameras.html',
    kind: 'webcam',
    description: 'Curated list of live aurora cameras updated by the Space Weather Live team — great starting point.',
    tags: ['Aggregator', 'Curated'],
  },
];

function kpCondition(kp: number | null): { label: string; color: string; dot: string } {
  if (kp === null) return { label: 'Loading…', color: 'text-[#64748b]', dot: 'bg-[#475569]' };
  if (kp >= 7)  return { label: 'Geomagnetic storm — excellent aurora visibility', color: 'text-emerald-300', dot: 'bg-emerald-400' };
  if (kp >= 5)  return { label: 'Active — good aurora at high latitudes', color: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (kp >= 3)  return { label: 'Moderate — possible in Norway, Iceland, Finland', color: 'text-amber-300', dot: 'bg-amber-400' };
  if (kp >= 1)  return { label: 'Low — visible only at very high latitudes', color: 'text-orange-400', dot: 'bg-orange-500' };
  return { label: 'Very low — unlikely to see aurora now', color: 'text-red-400', dot: 'bg-red-500' };
}

const KindBadge = ({ kind }: { kind: CameraKind }) => {
  if (kind === 'youtube') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
        <Youtube className="w-3 h-3" />
        YouTube
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
      <Globe className="w-3 h-3" />
      Webcam
    </span>
  );
};

const CameraCard = ({ cam, t }: { cam: Camera; t: (k: string) => string }) => {
  const isYouTube = cam.kind === 'youtube';
  return (
    <div className="glass-surface rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cam.flag}</span>
          <KindBadge kind={cam.kind} />
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {cam.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#64748b] border border-white/5">{tag}</span>
          ))}
        </div>
      </div>

      <p className="text-white font-semibold text-sm mb-0.5 leading-tight">{cam.name}</p>
      <p className="text-[#64748b] text-xs mb-1">{cam.org}</p>
      <p className="text-[#94a3b8] text-xs mb-2 flex items-center gap-1">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        {cam.location}, {cam.country}
      </p>
      <p className="text-[#475569] text-xs leading-relaxed flex-1">{cam.description}</p>

      {cam.seasonal && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-300/80">
          <CalendarClock className="w-3 h-3" />
          {t('livestream.seasonal')}: {cam.seasonal}
        </div>
      )}

      <a
        href={cam.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
          isYouTube
            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/30'
            : 'bg-white/5 border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10'
        }`}
      >
        {isYouTube ? <Youtube className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
        {isYouTube ? t('livestream.watchYouTube') : t('livestream.openSite')}
      </a>
    </div>
  );
};

export default function Livestream() {
  const { t } = useLanguage();
  const kp = useKpLive();
  const condition = kpCondition(kp);
  const youtubeCams = CAMERAS.filter(c => c.kind === 'youtube');
  const webcams = CAMERAS.filter(c => c.kind === 'webcam');

  return (
    <div className="min-h-screen px-4 pt-20 pb-24 max-w-6xl mx-auto">
      <PageMeta
        title="Aurora Livestream — The Storm Watcher"
        description="Live aurora cameras from Norway, Iceland, Finland, Sweden and Canada. Watch the northern lights in real time."
        path="/livestream"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Livestream', path: '/livestream' }]} />

      {/* Header */}
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 bg-gradient-to-br from-[#ec4899] to-[#be185d] rounded-2xl flex items-center justify-center flex-shrink-0">
          <Video className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{t('livestream.title') || 'Aurora Livestream'}</h1>
          <p className="text-[#94a3b8] mt-0.5">{t('livestream.subtitle') || 'Live cameras from the aurora zone'}</p>
        </div>
      </div>

      {/* Kp viewing conditions banner */}
      <div className="flex items-center gap-3 mb-6 glass-surface rounded-xl px-4 py-3 border border-white/10">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${condition.dot}`} />
        <span className="text-xs text-[#64748b]">Current viewing conditions:</span>
        <span className={`text-xs font-semibold ${condition.color}`}>
          {kp !== null && <span className="mr-1">Kp {kp.toFixed(1)} —</span>}
          {condition.label}
        </span>
      </div>

      <p className="text-[#64748b] text-sm mb-8">
        {t('livestream.disclaimerHonest')}
      </p>

      {/* YouTube Live section */}
      {youtubeCams.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Youtube className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">{t('livestream.sectionYouTube') || 'YouTube Channels'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {youtubeCams.map(cam => <CameraCard key={cam.id} cam={cam} t={t} />)}
          </div>
        </section>
      )}

      {/* Webcams section */}
      {webcams.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-300" />
            <h2 className="text-lg font-bold text-white">{t('livestream.sectionWebcams') || 'Live Webcams'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {webcams.map(cam => <CameraCard key={cam.id} cam={cam} t={t} />)}
          </div>
        </section>
      )}

      {/* Community streams — subscriber feature */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Community Streams</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 ml-1">Pro</span>
        </div>

        <PlanGuard requiredPlan="pro">
          <div className="glass-surface rounded-2xl p-8 border border-emerald-500/20 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Share your aurora stream</h3>
            <p className="text-[#64748b] text-sm mb-6 max-w-md mx-auto">
              Are you streaming aurora from your location? Share your YouTube live link or webcam URL with the community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="url"
                placeholder="YouTube or webcam URL…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-emerald-500/50"
                disabled
              />
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30 flex items-center gap-2 cursor-not-allowed"
              >
                <MapPin className="w-4 h-4" />
                Submit stream
              </button>
            </div>
            <p className="text-[#475569] text-xs mt-4">Feature coming soon — community streams will appear here in real time.</p>
          </div>
        </PlanGuard>
      </section>

      {/* Tip */}
      <div className="glass-surface rounded-2xl p-5 border border-white/10 text-center">
        <p className="text-[#64748b] text-sm">
          <span className="font-semibold text-[#94a3b8]">{t('livestream.tipTitle') || 'Tip:'}</span>{' '}
          {t('livestream.tip')}
        </p>
      </div>
    </div>
  );
}
