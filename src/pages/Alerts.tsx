import { useCallback, useEffect, useState } from 'react';
import PageMeta from '../components/PageMeta';
import {
  AlertTriangle, Info, AlertOctagon, ShieldAlert, Flame, Wind,
  ChevronDown, ChevronUp, MapPin, Zap, Radio,
} from 'lucide-react';
import { getAlerts, Alert as AlertType } from '../services/noaaApi';
import { getDonkiCme, getDonkiFlares, CmeEvent, FlareEvent } from '../services/donkiApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

// ── Scale reference data ──────────────────────────────────────────────────────

const G_SCALE: Record<number, { label: string; aurora: string; effects: string }> = {
  1: { label: 'Minor',    aurora: '≥ 60°N / 60°S', effects: 'Minor power grid fluctuations. Weak aurora at high latitudes.' },
  2: { label: 'Moderate', aurora: '≥ 55°N / 55°S', effects: 'Power system alarms. Aurora visible at high to mid-latitudes.' },
  3: { label: 'Strong',   aurora: '≥ 50°N / 50°S', effects: 'Satellite drag increases. Intermittent GPS errors. Aurora visible at mid-latitudes.' },
  4: { label: 'Severe',   aurora: '≥ 45°N / 45°S', effects: 'Widespread power voltage problems. Satellite navigation errors.' },
  5: { label: 'Extreme',  aurora: '≥ 40°N / 40°S', effects: 'Widespread power outages possible. Complete HF radio blackout.' },
};

const S_SCALE: Record<number, { label: string; effects: string }> = {
  1: { label: 'Minor',    effects: 'Minor risk to satellite operations in polar orbit.' },
  2: { label: 'Moderate', effects: 'Isolated satellite anomalies. Infrequent navigation errors.' },
  3: { label: 'Strong',   effects: 'Radiation hazard for astronauts and aircraft on polar flights.' },
  4: { label: 'Severe',   effects: 'High radiation risk for astronauts. Satellite power degradation.' },
  5: { label: 'Extreme',  effects: 'Significant radiation risk. Complete HF blackout on the sun-facing side.' },
};

const R_SCALE: Record<number, { label: string; effects: string }> = {
  1: { label: 'Minor',    effects: 'Weak HF radio degradation on the sunlit side of Earth.' },
  2: { label: 'Moderate', effects: 'Limited HF blackout on sunlit side. Loss of contact for ~10 minutes.' },
  3: { label: 'Strong',   effects: 'HF radio blackout on most of the sunlit side. Low-frequency navigation affected.' },
  4: { label: 'Severe',   effects: 'HF radio blackout on entire sunlit side. Navigation errors lasting hours.' },
  5: { label: 'Extreme',  effects: 'Complete HF blackout on entire sunlit side. GPS errors lasting hours.' },
};

// ── Parsing helpers ───────────────────────────────────────────────────────────

const parseScale = (message: string): { type: 'G' | 'S' | 'R' | null; level: number } => {
  const g = message.match(/\bG([1-5])\b/);
  const s = message.match(/\bS([1-5])\b/);
  const r = message.match(/\bR([1-5])\b/);
  if (g) return { type: 'G', level: parseInt(g[1]) };
  if (s) return { type: 'S', level: parseInt(s[1]) };
  if (r) return { type: 'R', level: parseInt(r[1]) };
  return { type: null, level: 0 };
};

const parseAlertType = (message: string): 'WARNING' | 'WATCH' | 'SUMMARY' | 'ADVISORY' => {
  const u = message.toUpperCase();
  if (u.includes('WARNING')) return 'WARNING';
  if (u.includes('WATCH')) return 'WATCH';
  if (u.includes('SUMMARY') || u.includes('EXTENDED')) return 'SUMMARY';
  return 'ADVISORY';
};

const parsePhenomenon = (message: string): string => {
  const u = message.toUpperCase();
  if (u.includes('GEOMAGNETIC STORM')) return 'Geomagnetic Storm';
  if (u.includes('SOLAR RADIATION STORM') || (u.includes('PROTON') && u.includes('STORM'))) return 'Solar Radiation Storm';
  if (u.includes('RADIO BLACKOUT')) return 'Radio Blackout';
  if (u.includes('SOLAR FLARE')) return 'Solar Flare';
  if (u.includes('CORONAL MASS') || u.includes('CME')) return 'Coronal Mass Ejection';
  if (u.includes('HIGH SPEED STREAM')) return 'High-Speed Solar Wind';
  if (u.includes('PROTON')) return 'Proton Event';
  return 'Space Weather Alert';
};

const getScaleColors = (type: 'G' | 'S' | 'R' | null, level: number) => {
  if (!type) return { text: 'text-[#94a3b8]', bg: 'bg-white/5', border: 'border-white/10' };
  if (type === 'G') {
    if (level === 1) return { text: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' };
    if (level === 2) return { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30' };
    if (level === 3) return { text: 'text-orange-500',  bg: 'bg-orange-500/15',  border: 'border-orange-500/40' };
    if (level === 4) return { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' };
    return             { text: 'text-red-500',     bg: 'bg-red-500/20',     border: 'border-red-500/50' };
  }
  if (type === 'S') {
    if (level <= 2) return { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' };
    if (level === 3) return { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' };
    return             { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' };
  }
  // R scale
  if (level <= 2) return { text: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30' };
  if (level === 3) return { text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30' };
  return             { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
};

const getAlertTypeInfo = (alertType: 'WARNING' | 'WATCH' | 'SUMMARY' | 'ADVISORY') => {
  switch (alertType) {
    case 'WARNING': return { label: 'Warning',  Icon: AlertOctagon, color: 'text-red-400',      chipBg: 'bg-red-500/20' };
    case 'WATCH':   return { label: 'Watch',    Icon: AlertTriangle, color: 'text-orange-400',  chipBg: 'bg-orange-500/15' };
    case 'SUMMARY': return { label: 'Summary',  Icon: Info,          color: 'text-blue-400',    chipBg: 'bg-blue-500/15' };
    case 'ADVISORY':return { label: 'Advisory', Icon: ShieldAlert,   color: 'text-[#10b981]',  chipBg: 'bg-emerald-500/15' };
  }
};

const parseFlareClass = (classType: string) => {
  const major = classType[0]?.toUpperCase() ?? 'C';
  const num = parseFloat(classType.slice(1)) || 1;
  const map: Record<string, { label: string; desc: string; color: string; bg: string; border: string }> = {
    X: { label: 'Extreme',  desc: 'Strongest class — can cause planet-wide radio blackouts and radiation storms.',         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
    M: { label: 'Strong',   desc: 'Can cause brief radio blackouts at high latitudes and minor radiation storms.',          color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    C: { label: 'Moderate', desc: 'Minor effects on HF communications near polar regions. No significant ground effects.',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    B: { label: 'Minor',    desc: 'Background-level flare. No significant effects expected on Earth.',                      color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30' },
    A: { label: 'Minimal',  desc: 'No noticeable effects on Earth.',                                                        color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/30' },
  };
  return { major, num, ...(map[major] ?? map['C']) };
};

const describeCmeSpeed = (speed: number) => {
  if (speed > 2000) return 'extremely fast';
  if (speed > 1200) return 'very fast';
  if (speed > 700)  return 'fast';
  if (speed > 400)  return 'moderate';
  return 'slow';
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ExpandBtn = ({ expanded, onToggle, light }: { expanded: boolean; onToggle: () => void; light: boolean }) => (
  <button
    onClick={onToggle}
    className={`mt-3 flex items-center gap-1 text-xs transition-colors ${
      light ? 'text-slate-400 hover:text-slate-600' : 'text-white/35 hover:text-white/60'
    }`}
  >
    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    {expanded ? 'Hide details' : 'Technical details'}
  </button>
);

const NoaaAlertCard = ({ alert, light }: { alert: AlertType; light: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  const { type: scaleType, level } = parseScale(alert.message);
  const alertType = parseAlertType(alert.message);
  const phenomenon = parsePhenomenon(alert.message);
  const typeInfo = getAlertTypeInfo(alertType);
  const sc = getScaleColors(scaleType, level);
  const scaleData = scaleType === 'G' ? G_SCALE[level]
    : scaleType === 'S' ? S_SCALE[level]
    : scaleType === 'R' ? R_SCALE[level]
    : null;

  const title = scaleType && level
    ? `${phenomenon} — ${scaleType}${level} (${scaleData?.label ?? ''})`
    : phenomenon;

  return (
    <div className={`border rounded-2xl overflow-hidden ${sc.bg} ${sc.border}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Scale badge */}
          <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${sc.bg} ${sc.border}`}>
            {scaleType ? (
              <>
                <span className={`text-lg font-black leading-none ${sc.text}`}>{scaleType}{level}</span>
                <span className={`text-[9px] uppercase tracking-wider ${sc.text} opacity-60`}>Scale</span>
              </>
            ) : (
              <typeInfo.Icon className={`w-5 h-5 ${typeInfo.color}`} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${typeInfo.color} ${typeInfo.chipBg}`}>
                {typeInfo.label}
              </span>
              <span className={`text-xs ${light ? 'text-slate-400' : 'text-white/40'}`}>
                {new Date(alert.issue_datetime).toLocaleString()}
              </span>
            </div>
            <h3 className={`font-bold text-[15px] leading-snug ${light ? 'text-slate-800' : 'text-white'}`}>{title}</h3>
          </div>
        </div>

        {scaleData && (
          <div className="mt-3 sm:ml-15 space-y-2">
            {scaleType === 'G' && (
              <div className="flex items-start gap-2">
                <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sc.text}`} />
                <span className={`text-sm ${light ? 'text-slate-600' : 'text-white/80'}`}>
                  <span className={`font-semibold ${sc.text}`}>Aurora visible</span>{' '}
                  down to {G_SCALE[level].aurora}
                </span>
              </div>
            )}
            {scaleType === 'S' && (
              <div className="flex items-start gap-2">
                <Radio className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sc.text}`} />
                <span className={`text-sm font-semibold ${sc.text}`}>Solar Radiation Storm</span>
              </div>
            )}
            {scaleType === 'R' && (
              <div className="flex items-start gap-2">
                <Radio className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sc.text}`} />
                <span className={`text-sm font-semibold ${sc.text}`}>Radio Blackout</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Zap className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sc.text}`} />
              <span className={`text-sm ${light ? 'text-slate-600' : 'text-white/70'}`}>{scaleData.effects}</span>
            </div>
          </div>
        )}

        <ExpandBtn expanded={expanded} onToggle={() => setExpanded(e => !e)} light={light} />
      </div>

      {expanded && (
        <div className={`px-4 sm:px-5 pb-4 border-t ${light ? 'border-black/5' : 'border-white/5'}`}>
          <div className={`mt-3 p-3 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto ${
            light ? 'bg-black/5 text-slate-600' : 'bg-black/25 text-white/50'
          }`}>
            {alert.message}
          </div>
        </div>
      )}
    </div>
  );
};

const CmeCard = ({ cme, light }: { cme: CmeEvent; light: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const analysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) ?? cme.cmeAnalyses?.[0];
  const enlil = analysis?.enlilList?.[0];
  const earthDirected = enlil?.isEarthGB === true;
  const speed = analysis?.speed;

  return (
    <div className={`border rounded-2xl overflow-hidden ${
      earthDirected ? 'bg-orange-500/10 border-orange-500/30' : light ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
    }`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
            earthDirected ? 'bg-orange-500/20' : light ? 'bg-black/8' : 'bg-white/10'
          }`}>
            <Wind className={`w-5 h-5 ${earthDirected ? 'text-orange-400' : light ? 'text-slate-500' : 'text-[#94a3b8]'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {earthDirected ? (
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-orange-400 bg-orange-500/20">
                  Earth-Directed
                </span>
              ) : (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  light ? 'text-slate-400 bg-slate-200' : 'text-white/40 bg-white/8'
                }`}>
                  Not Earth-directed
                </span>
              )}
              <span className={`text-xs ${light ? 'text-slate-400' : 'text-white/40'}`}>
                {new Date(cme.startTime).toLocaleString()}
              </span>
            </div>
            <h3 className={`font-bold text-[15px] ${light ? 'text-slate-800' : 'text-white'}`}>
              Coronal Mass Ejection
              {cme.sourceLocation && (
                <span className={`ml-2 text-sm font-normal ${light ? 'text-slate-400' : 'text-white/40'}`}>
                  from {cme.sourceLocation}
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="mt-3 sm:ml-15 space-y-2">
          {speed != null && (
            <div className="flex items-center gap-2">
              <Zap className={`w-3.5 h-3.5 shrink-0 ${earthDirected ? 'text-orange-400' : light ? 'text-slate-500' : 'text-[#94a3b8]'}`} />
              <span className={`text-sm ${light ? 'text-slate-600' : 'text-white/80'}`}>
                <span className={`font-semibold ${earthDirected ? 'text-orange-400' : light ? 'text-slate-700' : 'text-white'}`}>
                  {speed.toFixed(0)} km/s
                </span>
                {' '}— {describeCmeSpeed(speed)}{' '}
                <span className={light ? 'text-slate-400' : 'text-white/40'}>(average ~400 km/s)</span>
              </span>
            </div>
          )}
          {enlil?.estimatedShockArrivalTime && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-400" />
              <span className={`text-sm ${light ? 'text-slate-600' : 'text-white/80'}`}>
                <span className="font-semibold text-orange-400">Estimated arrival: </span>
                {new Date(enlil.estimatedShockArrivalTime).toLocaleString()}
                {enlil.kp_90 != null && (
                  <span className={light ? 'text-slate-400' : 'text-white/50'}> · Expected Kp: {enlil.kp_90}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {cme.note && (
          <>
            <ExpandBtn expanded={expanded} onToggle={() => setExpanded(e => !e)} light={light} />
            {expanded && (
              <p className={`mt-2 text-sm leading-relaxed ${light ? 'text-slate-600' : 'text-white/60'}`}>{cme.note}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const FlareCard = ({ flare, light }: { flare: FlareEvent; light: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const cls = parseFlareClass(flare.classType);

  return (
    <div className={`border rounded-2xl overflow-hidden ${cls.bg} ${cls.border}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${cls.bg} ${cls.border}`}>
            <span className={`text-lg font-black leading-none ${cls.color}`}>{cls.major}</span>
            <span className={`text-[9px] ${cls.color} opacity-60`}>{cls.num.toFixed(1)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls.color} ${cls.bg}`}>
                {cls.label} Flare
              </span>
              {flare.sourceLocation && (
                <span className={`text-xs ${light ? 'text-slate-400' : 'text-white/40'}`}>{flare.sourceLocation}</span>
              )}
              <span className={`text-xs ${light ? 'text-slate-400' : 'text-white/40'}`}>
                {new Date(flare.beginTime).toLocaleString()}
              </span>
            </div>
            <h3 className={`font-bold text-[15px] ${light ? 'text-slate-800' : 'text-white'}`}>
              Solar Flare — Class {flare.classType}
            </h3>
          </div>
        </div>

        <div className="mt-2 sm:ml-15">
          <p className={`text-sm ${light ? 'text-slate-600' : 'text-white/70'}`}>{cls.desc}</p>
          {flare.note && (
            <>
              <ExpandBtn expanded={expanded} onToggle={() => setExpanded(e => !e)} light={light} />
              {expanded && (
                <p className={`mt-2 text-sm leading-relaxed ${light ? 'text-slate-600' : 'text-white/60'}`}>{flare.note}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Section header ────────────────────────────────────────────────────────────

const SectionHeader = ({
  icon, iconBg, title, subtitle, light,
}: { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; light: boolean }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
      {icon}
    </div>
    <div>
      <h2 className={`text-lg sm:text-xl font-bold ${light ? 'text-slate-800' : 'text-white'}`}>{title}</h2>
      <p className={`text-sm ${light ? 'text-slate-400' : 'text-[#94a3b8]'}`}>{subtitle}</p>
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const Alerts = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const light = theme === 'light';

  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [cmeEvents, setCmeEvents] = useState<CmeEvent[]>([]);
  const [flareEvents, setFlareEvents] = useState<FlareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const [noaaData, cmeData, flareData] = await Promise.allSettled([
      getAlerts(),
      getDonkiCme(),
      getDonkiFlares(),
    ]);
    if ([noaaData, cmeData, flareData].every(r => r.status === 'rejected')) {
      setFetchError(true);
      setLoading(false);
      return;
    }
    setFetchError(false);
    if (noaaData.status === 'fulfilled') setAlerts(noaaData.value || []);
    if (cmeData.status  === 'fulfilled') setCmeEvents(cmeData.value || []);
    if (flareData.status === 'fulfilled') setFlareEvents(flareData.value || []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') fetchAlerts();
    }, 120_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={`text-center rounded-2xl p-10 border max-w-sm w-full ${light ? 'bg-white border-slate-200' : 'glass-surface border-white/10'}`}>
          <AlertOctagon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className={`font-semibold text-lg mb-2 ${light ? 'text-slate-800' : 'text-white'}`}>
            {t('alerts.fetchError') || 'Could not load alerts'}
          </h2>
          <p className={`text-sm mb-6 ${light ? 'text-slate-400' : 'text-[#64748b]'}`}>
            {t('alerts.fetchErrorDesc') || 'NOAA servers may be temporarily unavailable.'}
          </p>
          <button
            onClick={fetchAlerts}
            className="px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
          >
            {t('alerts.retry') || 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  const hasAnything = alerts.length > 0 || cmeEvents.length > 0 || flareEvents.length > 0;

  return (
    <div className="min-h-screen pt-20 pb-24 md:pt-24">
      <PageMeta
        title="Space Weather Alerts — The Storm Watcher"
        description="Live geomagnetic storm warnings, solar flare alerts and coronal mass ejection reports from NOAA SWPC and NASA DONKI. Know what's happening in space right now."
        path="/alerts"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Page header */}
        <div className="mb-6 sm:mb-10">
          <h1 className={`text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 ${light ? 'text-slate-800' : 'text-white'}`}>
            {t('alerts.title')}
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <p className={`text-sm ${light ? 'text-slate-400' : 'text-[#94a3b8]'}`}>
              {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* All-clear state */}
        {!hasAnything && (
          <div className={`border rounded-2xl p-10 text-center ${light ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-[#10b981]" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${light ? 'text-slate-800' : 'text-white'}`}>
              {t('alerts.allClear')}
            </h3>
            <p className={light ? 'text-slate-500' : 'text-[#94a3b8]'}>{t('alerts.noActiveAlerts')}</p>
          </div>
        )}

        {/* NOAA alerts */}
        {alerts.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <SectionHeader
              icon={<AlertTriangle className="w-5 h-5 text-white" />}
              iconBg="bg-gradient-to-br from-red-500 to-orange-500"
              title={t('alerts.active') || 'Active Alerts'}
              subtitle="NOAA Space Weather Prediction Center"
              light={light}
            />
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <NoaaAlertCard key={i} alert={alert} light={light} />
              ))}
            </div>
          </section>
        )}

        {/* CME events */}
        {cmeEvents.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <SectionHeader
              icon={<Wind className="w-5 h-5 text-white" />}
              iconBg="bg-gradient-to-br from-orange-500 to-red-500"
              title={t('alerts.cme') || 'Coronal Mass Ejections'}
              subtitle={t('alerts.donkiLast7') || 'NASA DONKI · last 7 days'}
              light={light}
            />
            <div className="space-y-3">
              {cmeEvents.slice(-10).reverse().map(cme => (
                <CmeCard key={cme.activityID} cme={cme} light={light} />
              ))}
            </div>
          </section>
        )}

        {/* Solar flares */}
        {flareEvents.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <SectionHeader
              icon={<Flame className="w-5 h-5 text-white" />}
              iconBg="bg-gradient-to-br from-yellow-500 to-orange-500"
              title={t('alerts.solarFlares') || 'Solar Flares'}
              subtitle={t('alerts.donkiLast7') || 'NASA DONKI · last 7 days'}
              light={light}
            />
            <div className="space-y-3">
              {flareEvents.slice(-10).reverse().map(flare => (
                <FlareCard key={flare.flrID} flare={flare} light={light} />
              ))}
            </div>
          </section>
        )}

        {/* Scale guide */}
        <section className={`rounded-2xl border p-5 sm:p-7 ${light ? 'bg-slate-50 border-slate-200' : 'glass-surface border-white/10'}`}>
          <h3 className={`text-base font-bold mb-4 ${light ? 'text-slate-800' : 'text-white'}`}>
            {t('alerts.aboutTitle') || 'About Space Weather Scales'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* G scale */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${light ? 'text-slate-500' : 'text-white/40'}`}>
                G · Geomagnetic
              </p>
              <div className="space-y-1.5">
                {([1,2,3,4,5] as const).map(n => {
                  const sc = getScaleColors('G', n);
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-6 ${sc.text}`}>G{n}</span>
                      <span className={`text-xs ${light ? 'text-slate-500' : 'text-white/50'}`}>{G_SCALE[n].label}</span>
                      <span className={`text-[10px] ml-auto ${light ? 'text-slate-400' : 'text-white/30'}`}>{G_SCALE[n].aurora}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* S scale */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${light ? 'text-slate-500' : 'text-white/40'}`}>
                S · Solar Radiation
              </p>
              <div className="space-y-1.5">
                {([1,2,3,4,5] as const).map(n => {
                  const sc = getScaleColors('S', n);
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-6 ${sc.text}`}>S{n}</span>
                      <span className={`text-xs ${light ? 'text-slate-500' : 'text-white/50'}`}>{S_SCALE[n].label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* R scale */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${light ? 'text-slate-500' : 'text-white/40'}`}>
                R · Radio Blackout
              </p>
              <div className="space-y-1.5">
                {([1,2,3,4,5] as const).map(n => {
                  const sc = getScaleColors('R', n);
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-6 ${sc.text}`}>R{n}</span>
                      <span className={`text-xs ${light ? 'text-slate-500' : 'text-white/50'}`}>{R_SCALE[n].label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className={`text-xs mt-5 ${light ? 'text-slate-400' : 'text-white/30'}`}>
            {t('alerts.aboutText')}
          </p>
        </section>

      </div>
    </div>
  );
};

export default Alerts;
