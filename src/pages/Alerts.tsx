import { useCallback, useEffect, useMemo, useState } from 'react';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import {
  Flame, Wind, Info, Eye, CheckCircle2,
  AlertOctagon, Zap, Radio, ShieldAlert, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getAlerts, Alert as AlertType } from '../services/noaaApi';
import { getDonkiCme, getDonkiFlares, CmeEvent, FlareEvent } from '../services/donkiApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

/* ─── time helpers ─────────────────────────────────────────── */

function timeAgo(dateStr: string, t: (k: string) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 6e4);
  const h = Math.floor(diff / 36e5);
  const d = Math.floor(h / 24);
  if (m < 2) return t('alerts.justNow');
  if (m < 60) return t('alerts.mAgo').replace('{m}', String(m));
  if (h < 24) return t('alerts.hAgo').replace('{h}', String(h));
  return t('alerts.dAgo').replace('{d}', String(d));
}

function timeUntilHours(dateStr: string): number | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.round(diff / 36e5);
}

function groupLabel(dateStr: string): 'now' | 'today' | 'week' {
  const h = (Date.now() - new Date(dateStr).getTime()) / 36e5;
  if (h < 3) return 'now';
  if (h < 24) return 'today';
  return 'week';
}

/* ─── NOAA message parser ──────────────────────────────────── */

function parseProduct(message: string) {
  const lines = message.split('\n').map(l => l.trim());
  const line = lines.find(l => l.startsWith(':Product:'));
  return line ? line.replace(':Product:', '').trim().toLowerCase() : '';
}

function extractScale(msg: string, letter: string): number {
  const m = msg.toUpperCase().match(new RegExp(`${letter}(\\d)`));
  return m ? Number(m[1]) : 0;
}

/* ─── Unified FeedItem ─────────────────────────────────────── */

type Severity = 1 | 2 | 3 | 4;
type FeedItem = {
  id: string;
  type: 'storm' | 'radio' | 'radiation' | 'flare' | 'cme' | 'summary';
  title: string;
  subtitle: string;
  impact: string;
  severity: Severity;
  scale?: { letter: string; current: number };
  eta?: number | null;      // hours until arrival (CME)
  arrived?: boolean;
  dateStr: string;
  raw?: string;
  priority: number;         // 0=highest
};

function buildNoaaItem(alert: AlertType, t: (k: string) => string): FeedItem {
  const product = parseProduct(alert.message);
  const msg = alert.message.toUpperCase();
  let severity: Severity = 1;
  if (msg.includes('WARNING') || msg.includes('EXTREME')) severity = 4;
  else if (msg.includes('WATCH') || msg.includes('ALERT')) severity = 3;
  else if (msg.includes('SUMMARY')) severity = 2;

  const scaleLabels = (n: number) => [
    '', t('alerts.scale.minor'), t('alerts.scale.moderate'),
    t('alerts.scale.strong'), t('alerts.scale.severe'), t('alerts.scale.extreme'),
  ][n] ?? '';

  if (product.includes('geomagnetic')) {
    const g = extractScale(msg, 'G');
    return {
      id: `noaa-${alert.issue_datetime}`,
      type: 'storm',
      title: t('alerts.type.geoStorm'),
      subtitle: g
        ? `G${g} — ${scaleLabels(g)}`
        : severity === 4 ? t('alerts.status.warning') : severity === 3 ? t('alerts.status.watch') : t('alerts.status.summary'),
      impact: g >= 4
        ? t('alerts.impact.geoStorm.high')
        : g >= 2
          ? t('alerts.impact.geoStorm.moderate')
          : t('alerts.impact.geoStorm.low'),
      severity,
      scale: g ? { letter: 'G', current: g } : undefined,
      dateStr: alert.issue_datetime,
      raw: alert.message,
      priority: severity === 4 ? 1 : severity === 3 ? 3 : 6,
    };
  }
  if (product.includes('radio blackout')) {
    const r = extractScale(msg, 'R');
    return {
      id: `noaa-${alert.issue_datetime}`,
      type: 'radio',
      title: t('alerts.type.radioBlackout'),
      subtitle: r ? `R${r} — ${scaleLabels(r)}` : t('alerts.sub.hfAffected'),
      impact: r >= 4
        ? t('alerts.impact.radio.high')
        : r >= 2
          ? t('alerts.impact.radio.moderate')
          : t('alerts.impact.radio.low'),
      severity,
      scale: r ? { letter: 'R', current: r } : undefined,
      dateStr: alert.issue_datetime,
      raw: alert.message,
      priority: severity === 4 ? 2 : 5,
    };
  }
  if (product.includes('solar radiation') || product.includes('proton')) {
    const s = extractScale(msg, 'S');
    return {
      id: `noaa-${alert.issue_datetime}`,
      type: 'radiation',
      title: t('alerts.type.radStorm'),
      subtitle: s ? `S${s} — ${scaleLabels(s)}` : t('alerts.sub.elevatedRad'),
      impact: t('alerts.impact.radiation'),
      severity,
      scale: s ? { letter: 'S', current: s } : undefined,
      dateStr: alert.issue_datetime,
      raw: alert.message,
      priority: severity === 4 ? 2 : 4,
    };
  }
  return {
    id: `noaa-${alert.issue_datetime}`,
    type: 'summary',
    title: t('alerts.type.update'),
    subtitle: t('alerts.sub.routine'),
    impact: t('alerts.impact.summary'),
    severity: 1,
    dateStr: alert.issue_datetime,
    raw: alert.message,
    priority: 8,
  };
}

function buildCmeItem(cme: CmeEvent, t: (k: string) => string): FeedItem {
  const analysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) ?? cme.cmeAnalyses?.[0];
  const enlil = analysis?.enlilList?.[0];
  const isEarth = enlil?.isEarthGB ?? false;
  const kp = enlil?.kp_90 ? Number(enlil.kp_90) : null;
  const eta = enlil?.estimatedShockArrivalTime ? timeUntilHours(enlil.estimatedShockArrivalTime) : null;
  const arrived = enlil?.estimatedShockArrivalTime ? new Date(enlil.estimatedShockArrivalTime) < new Date() : false;
  const severity: Severity = isEarth ? (kp && kp >= 7 ? 4 : kp && kp >= 5 ? 3 : 2) : 1;
  return {
    id: cme.activityID,
    type: 'cme',
    title: isEarth ? t('alerts.type.cmeEarth') : t('alerts.type.cmeAway'),
    subtitle: isEarth
      ? (arrived
          ? t('alerts.cme.arrived')
          : eta !== null
            ? t('alerts.cme.arriving').replace('{eta}', String(eta))
            : t('alerts.cme.calculated'))
      : (analysis?.speed
          ? `${analysis.speed.toFixed(0)} km/s · ${t('alerts.cme.away')}`
          : t('alerts.cme.away')),
    impact: isEarth
      ? (kp && kp >= 7
          ? t('alerts.impact.cme.high')
          : kp && kp >= 5
            ? t('alerts.impact.cme.moderate')
            : t('alerts.impact.cme.low'))
      : t('alerts.impact.cme.away'),
    severity,
    eta,
    arrived,
    scale: kp ? { letter: 'G', current: Math.min(5, Math.round(kp / 2)) } : undefined,
    dateStr: cme.startTime,
    priority: isEarth ? (arrived ? 0 : eta !== null && eta < 12 ? 0 : 1) : 9,
  };
}

function buildFlareItem(flare: FlareEvent, t: (k: string) => string): FeedItem {
  const letter = flare.classType[0]?.toUpperCase() ?? 'A';
  const scaleMap: Record<string, number> = { A: 1, B: 1, C: 2, M: 3, X: 4 };
  const severity = (scaleMap[letter] ?? 1) as Severity;
  const flareLabel = letter === 'X'
    ? t('alerts.flare.extreme')
    : letter === 'M'
      ? t('alerts.flare.moderate')
      : letter === 'C'
        ? t('alerts.flare.weak')
        : t('alerts.flare.negligible');
  return {
    id: flare.flrID,
    type: 'flare',
    title: t('alerts.type.solarFlare'),
    subtitle: `Class ${flare.classType} — ${flareLabel}`,
    impact: letter === 'X'
      ? t('alerts.impact.flare.x')
      : letter === 'M'
        ? t('alerts.impact.flare.m')
        : letter === 'C'
          ? t('alerts.impact.flare.c')
          : t('alerts.impact.flare.weak'),
    severity,
    scale: { letter: 'F', current: scaleMap[letter] ?? 1 },
    dateStr: flare.beginTime,
    priority: letter === 'X' ? 2 : letter === 'M' ? 4 : 7,
  };
}

/* ─── Visual sub-components ────────────────────────────────── */

const typeConfig = {
  storm:     { icon: Zap,          bg: 'bg-purple-500/15', text: 'text-purple-400', glow: 'border-purple-500/30' },
  radio:     { icon: Radio,        bg: 'bg-blue-500/15',   text: 'text-blue-400',   glow: 'border-blue-500/30' },
  radiation: { icon: ShieldAlert,  bg: 'bg-amber-500/15',  text: 'text-amber-400',  glow: 'border-amber-500/30' },
  flare:     { icon: Flame,        bg: 'bg-orange-500/15', text: 'text-orange-400', glow: 'border-orange-500/30' },
  cme:       { icon: Wind,         bg: 'bg-red-500/15',    text: 'text-red-400',    glow: 'border-red-500/30' },
  summary:   { icon: Info,         bg: 'bg-sky-500/15',    text: 'text-sky-400',    glow: 'border-sky-500/20' },
};

const sevBorder: Record<Severity, string> = {
  1: 'border-white/8',
  2: 'border-yellow-500/25',
  3: 'border-orange-500/30',
  4: 'border-red-500/40',
};
const sevBg: Record<Severity, string> = {
  1: 'bg-white/3',
  2: 'bg-yellow-500/5',
  3: 'bg-orange-500/8',
  4: 'bg-red-500/10',
};

const scaleColors = ['', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500', 'bg-red-700'];
const scaleTxt    = ['', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-500', 'text-red-700'];
function NoaaScale({ letter, current, t }: { letter: string; current: number; t: (k: string) => string }) {
  const max = 5;
  const safe = Math.min(Math.max(current, 1), max);
  const gLabels = ['', t('alerts.scale.minor'), t('alerts.scale.moderate'), t('alerts.scale.strong'), t('alerts.scale.severe'), t('alerts.scale.extreme')];
  const fLabels = ['', t('alerts.flare.negligible'), t('alerts.flare.weak'), t('alerts.flare.moderate'), t('alerts.flare.extreme'), ''];
  const flareLetters = ['A', 'C', 'M', 'X', ''] as const;
  const flareLabel   = ['', 'C', 'M', 'X', 'X+'] as const;
  const labels = letter === 'F' ? fLabels : gLabels;
  return (
    <div className="flex items-center gap-1 mt-2">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex flex-col items-center gap-1">
          <div className={`h-1.5 w-7 sm:w-8 rounded-full ${n <= safe ? scaleColors[safe] : 'bg-white/10'}`} />
          <span className={`text-[9px] font-bold hidden sm:block ${n === safe ? scaleTxt[safe] : 'text-white/25'}`}>
            {letter === 'F' ? (flareLetters[n - 1] ?? '') : `${letter}${n}`}
          </span>
        </div>
      ))}
      <span className={`ml-2 text-xs font-bold ${scaleTxt[safe]}`}>
        {letter === 'F' ? (flareLabel[safe - 1] ?? '') : `${letter}${safe}`} · {labels[safe] ?? ''}
      </span>
    </div>
  );
}

function ImpactBlock({ text, t }: { text: string; t: (k: string) => string }) {
  return (
    <div className="mt-3 flex gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
      <Eye className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wide mb-0.5">{t('alerts.impact.label')}</p>
        <p className="text-gray-200 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

/* ─── Hero card ────────────────────────────────────────────── */

type GlobalStatus = 'incoming' | 'active' | 'minor' | 'calm';

function HeroCard({ status, lastUpdated, theme, t }: { status: GlobalStatus; lastUpdated: Date; theme: string; t: (k: string) => string }) {
  const cfg = {
    incoming: { bg: 'bg-red-500/15',    border: 'border-red-500/35',    icon: AlertOctagon, iconColor: 'text-red-400', iconBg: 'bg-red-500/20',    headline: t('alerts.hero.incoming'),  sub: t('alerts.hero.incomingSub') },
    active:   { bg: 'bg-orange-500/12', border: 'border-orange-500/30', icon: Zap,          iconColor: 'text-orange-400', iconBg: 'bg-orange-500/20', headline: t('alerts.hero.active'),   sub: t('alerts.hero.activeSub') },
    minor:    { bg: 'bg-yellow-500/8',  border: 'border-yellow-500/25', icon: Info,         iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/15', headline: t('alerts.hero.minor'), sub: t('alerts.hero.minorSub') },
    calm:     { bg: 'bg-green-500/8',   border: 'border-green-500/20',  icon: CheckCircle2, iconColor: 'text-green-400', iconBg: 'bg-green-500/15',  headline: t('alerts.hero.calm'),     sub: t('alerts.hero.calmSub') },
  }[status];

  const Icon = cfg.icon;
  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} p-5 mb-5`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-7 h-7 ${cfg.iconColor}`} strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{cfg.headline}</h2>
            {status === 'incoming' && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
            {status === 'active'   && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
          </div>
          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>{cfg.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-gray-500">{t('alerts.liveUpdated')} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

/* ─── Filter chips ─────────────────────────────────────────── */

type Filter = 'all' | 'storms' | 'flares' | 'cmes' | 'reports';

function FilterChips({ active, onChange, counts, theme, t }: { active: Filter; onChange: (f: Filter) => void; counts: Record<Filter, number>; theme: string; t: (k: string) => string }) {
  const chips: { key: Filter; label: string }[] = [
    { key: 'all',     label: t('alerts.filter.all') },
    { key: 'storms',  label: t('alerts.filter.storms') },
    { key: 'flares',  label: t('alerts.filter.flares') },
    { key: 'cmes',    label: t('alerts.filter.cmes') },
    { key: 'reports', label: t('alerts.filter.reports') },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
      {chips.map(({ key, label }) => {
        const count = counts[key];
        if (key !== 'all' && count === 0) return null;
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? theme === 'light' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                : theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive
                  ? theme === 'light' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                  : 'bg-white/15 text-white/60'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────── */

const Alerts = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [cmeEvents, setCmeEvents] = useState<CmeEvent[]>([]);
  const [flareEvents, setFlareEvents] = useState<FlareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const [noaaData, cmeData, flareData] = await Promise.allSettled([
      getAlerts(), getDonkiCme(), getDonkiFlares(),
    ]);
    if (![noaaData, cmeData, flareData].some(r => r.status === 'fulfilled')) {
      setFetchError(true); setLoading(false); return;
    }
    setFetchError(false);
    if (noaaData.status === 'fulfilled') setAlerts(noaaData.value || []);
    if (cmeData.status === 'fulfilled') setCmeEvents(cmeData.value || []);
    if (flareData.status === 'fulfilled') setFlareEvents(flareData.value || []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => { if (document.visibilityState !== 'hidden') fetchAlerts(); }, 120000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const feed = useMemo((): FeedItem[] => {
    const seen = new Set<string>();
    const items: FeedItem[] = [
      ...alerts.map(a => buildNoaaItem(a, t)),
      ...cmeEvents.map(c => buildCmeItem(c, t)),
      ...flareEvents.map(f => buildFlareItem(f, t)),
    ].filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return items.sort((a, b) => a.priority - b.priority || new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
  }, [alerts, cmeEvents, flareEvents, t]);

  const globalStatus = useMemo((): GlobalStatus => {
    const hasIncoming = feed.some(f => f.type === 'cme' && !f.arrived && f.eta !== null && f.eta !== undefined && f.eta > 0 && (f as FeedItem & { type: 'cme' }).severity >= 2);
    if (hasIncoming) return 'incoming';
    const maxSev = feed.reduce((m, f) => Math.max(m, f.severity), 0);
    if (maxSev >= 4) return 'active';
    if (maxSev >= 2) return 'minor';
    return 'calm';
  }, [feed]);

  const counts = useMemo(() => ({
    all:     feed.length,
    storms:  feed.filter(f => f.type === 'storm').length,
    flares:  feed.filter(f => f.type === 'flare').length,
    cmes:    feed.filter(f => f.type === 'cme').length,
    reports: feed.filter(f => f.type === 'summary').length,
  }), [feed]);

  const filteredFeed = useMemo(() => {
    if (activeFilter === 'all') return feed;
    const map: Record<Filter, FeedItem['type'][]> = {
      all: [],
      storms:  ['storm'],
      flares:  ['flare'],
      cmes:    ['cme'],
      reports: ['summary'],
    };
    return feed.filter(f => map[activeFilter].includes(f.type));
  }, [feed, activeFilter]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin" />
    </div>
  );

  if (fetchError) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center glass-surface rounded-2xl p-10 border border-white/10 max-w-sm w-full">
        <AlertOctagon className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
        <h2 className={`font-semibold text-lg mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t('alerts.fetchError') || 'Could not load alerts'}</h2>
        <p className="text-[#64748b] text-sm mb-6">{t('alerts.fetchErrorDesc') || 'NOAA servers may be temporarily unavailable.'}</p>
        <button onClick={fetchAlerts} className="px-5 py-2.5 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-sm font-medium hover:bg-[#ef4444]/30 transition-colors">
          {t('alerts.retry') || 'Try again'}
        </button>
      </div>
    </div>
  );

  // All-clear full screen
  if (feed.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <PageMeta title="Space Weather Alerts — The Storm Watcher" description="Real-time NOAA space weather alerts in plain language." path="/alerts" />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Alerts', path: '/alerts' }]} />
      <div className="w-24 h-24 rounded-full bg-green-500/15 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-400" strokeWidth={1.5} />
      </div>
      <h1 className={`text-3xl font-bold mb-3 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t('alerts.allClear')}</h1>
      <p className="text-gray-400 text-base max-w-xs leading-relaxed">{t('alerts.noActiveAlerts')}<br />{t('alerts.calmTonight') || 'Space weather is calm tonight.'}</p>
      <div className="flex items-center gap-1.5 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-gray-500">{t('alerts.liveUpdated')} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );

  const groups: Record<'now' | 'today' | 'week', FeedItem[]> = { now: [], today: [], week: [] };
  filteredFeed.forEach(f => groups[groupLabel(f.dateStr)].push(f));

  const groupTitles: Record<string, string> = {
    now:   t('alerts.groupNow') || 'Active Now',
    today: t('alerts.groupToday') || 'Today',
    week:  t('alerts.groupWeek') || 'Earlier This Week',
  };

  return (
    <div className={`min-h-screen pt-20 pb-24 md:pt-24 ${theme === 'light' ? 'bg-white' : ''}`}>
      <PageMeta title="Space Weather Alerts — The Storm Watcher" description="Real-time NOAA space weather alerts, CMEs and solar flares in plain language." path="/alerts" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Page header */}
        <div className="mb-5">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-0.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t('alerts.title')}</h1>
        </div>

        {/* Hero */}
        <HeroCard status={globalStatus} lastUpdated={lastUpdated} theme={theme} t={t} />

        {/* Filter chips */}
        <FilterChips active={activeFilter} onChange={setActiveFilter} counts={counts} theme={theme} t={t} />

        {/* Feed grouped by time */}
        {(['now', 'today', 'week'] as const).map(group => {
          const items = groups[group];
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className={`text-xs uppercase tracking-wider font-semibold mb-2 mt-5 first:mt-0 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                {groupTitles[group]}
              </p>
              <div className="space-y-3">
                {items.map(item => {
                  const cfg = typeConfig[item.type];
                  const Icon = cfg.icon;
                  const isOpen = expanded[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border overflow-hidden ${sevBg[item.severity]} ${sevBorder[item.severity]}`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3.5">
                          {/* Icon */}
                          <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${cfg.text}`} strokeWidth={1.8} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className={`font-bold text-base leading-snug ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{item.title}</h3>
                                <p className={`text-sm mt-0.5 ${cfg.text} font-medium`}>{item.subtitle}</p>
                              </div>
                              <span className="text-[#64748b] text-xs shrink-0 mt-0.5">{timeAgo(item.dateStr, t)}</span>
                            </div>

                            {/* Scale */}
                            {item.scale && <NoaaScale letter={item.scale.letter} current={item.scale.current} t={t} />}

                            {/* CME ETA bar */}
                            {item.type === 'cme' && item.eta !== null && item.eta !== undefined && item.eta > 0 && (
                              <div className="mt-3 bg-orange-500/12 border border-orange-500/25 rounded-xl px-3.5 py-2.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-orange-200 text-sm font-semibold">⏱ {t('alerts.etaBar').replace('{eta}', String(item.eta))}</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-white/10">
                                  <div
                                    className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                                    style={{ width: `${Math.max(4, 100 - Math.min(100, (item.eta / 72) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {item.type === 'cme' && item.arrived && (
                              <div className="mt-3 bg-red-500/12 border border-red-500/25 rounded-xl px-3.5 py-2.5">
                                <p className="text-red-200 text-sm font-semibold">🛬 {t('alerts.arrivedBar')}</p>
                              </div>
                            )}

                            {/* Impact block */}
                            <ImpactBlock text={item.impact} t={t} />
                          </div>
                        </div>
                      </div>

                      {/* Technical details toggle (only for NOAA alerts) */}
                      {item.raw && (
                        <>
                          <button
                            onClick={() => setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))}
                            className={`w-full flex items-center justify-between px-5 py-2.5 border-t text-xs transition-colors ${
                              theme === 'light'
                                ? 'border-slate-200 text-slate-400 hover:text-slate-700'
                                : 'border-white/8 text-[#64748b] hover:text-white'
                            }`}
                          >
                            <span>{t('alerts.technical')}</span>
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4">
                              <pre className="text-[#64748b] text-xs leading-relaxed whitespace-pre-wrap font-mono bg-black/20 rounded-xl p-4 overflow-x-auto">
                                {item.raw}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default Alerts;
