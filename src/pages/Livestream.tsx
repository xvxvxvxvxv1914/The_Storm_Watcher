import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { Video, ExternalLink, Globe, Youtube, CalendarClock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  // ─── YouTube live channels (open in YouTube, no broken iframes) ───
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
    description: 'Multi-camera Arctic feeds from explore.org — Hudson Bay, Manitoba. Polar bears by day, aurora by night.',
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

  // ─── External webcams (open in a new tab) ───
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
    name: 'Tromsø Webcams',
    org: 'Visit Tromsø',
    location: 'Tromsø',
    country: 'Norway',
    flag: '🇳🇴',
    url: 'https://www.visittromso.no/en/resources/webcams',
    kind: 'webcam',
    description: 'Network of webcams from Tromsø, the aurora capital of Norway.',
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
    id: 'svo_finland',
    name: 'Sodankylä All-Sky',
    org: 'SGO / Univ. of Oulu',
    location: 'Sodankylä, Lapland',
    country: 'Finland',
    flag: '🇫🇮',
    url: 'https://www.sgo.fi/Data/RealTime/realtime.php',
    kind: 'webcam',
    description: 'Real-time all-sky camera from the Sodankylä Geophysical Observatory. Refreshing JPG image.',
    tags: ['All-Sky', 'Scientific'],
  },
];

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
        <Globe className="w-3 h-3 flex-shrink-0" />
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
        {t('livestream.disclaimerHonest')}
      </p>

      {/* YouTube Live section */}
      {youtubeCams.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Youtube className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">{t('livestream.sectionYouTube')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {youtubeCams.map(cam => <CameraCard key={cam.id} cam={cam} t={t} />)}
          </div>
        </section>
      )}

      {/* Webcams section */}
      {webcams.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-300" />
            <h2 className="text-lg font-bold text-white">{t('livestream.sectionWebcams')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {webcams.map(cam => <CameraCard key={cam.id} cam={cam} t={t} />)}
          </div>
        </section>
      )}

      <div className="glass-surface rounded-2xl p-5 border border-white/10 text-center">
        <p className="text-[#64748b] text-sm">
          <span className="font-semibold text-[#94a3b8]">{t('livestream.tipTitle') || 'Tip:'}</span>{' '}
          {t('livestream.tip')}
        </p>
      </div>
    </div>
  );
}
