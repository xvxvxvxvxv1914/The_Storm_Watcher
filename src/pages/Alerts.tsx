import { useCallback, useEffect, useState } from 'react';
import PageMeta from '../components/PageMeta';
import { AlertTriangle, Info, AlertOctagon, ShieldAlert, Flame, Wind, ChevronDown, ChevronUp, CheckCircle, Zap } from 'lucide-react';
import { getAlerts, Alert as AlertType } from '../services/noaaApi';
import { getDonkiCme, getDonkiFlares, CmeEvent, FlareEvent } from '../services/donkiApi';
import { useLanguage } from '../contexts/LanguageContext';

function parseNoaaMessage(message: string) {
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const get = (key: string) => {
    const line = lines.find(l => l.startsWith(key));
    return line ? line.replace(key, '').trim() : null;
  };
  const product = get(':Product:') ?? get('Product:');
  const issued = get(':Issued:') ?? get('Issued:');
  const summaryLines = lines.filter(l =>
    !l.startsWith(':') &&
    !l.startsWith('#') &&
    !l.match(/^(Space Weather|NOAA|Product|Issued|Serial)/i) &&
    l.length > 20
  );
  return { product, issued, summary: summaryLines[0] ?? null };
}

function friendlyProduct(raw: string | null): string {
  if (!raw) return 'Space Weather Alert';
  const r = raw.toLowerCase();
  if (r.includes('geomagnetic')) return 'Geomagnetic Storm';
  if (r.includes('solar radiation')) return 'Solar Radiation Storm';
  if (r.includes('radio blackout')) return 'Radio Blackout';
  if (r.includes('proton')) return 'Proton Event';
  if (r.includes('x-ray')) return 'X-ray Event';
  if (r.includes('summary')) return 'Space Weather Summary';
  if (r.includes('outlook')) return 'Space Weather Outlook';
  return raw.replace(/\b\w/g, c => c.toUpperCase());
}

function flareInfo(classType: string) {
  const letter = classType[0]?.toUpperCase();
  if (letter === 'X') return { label: 'X-class — Extreme', color: 'text-red-400', bg: 'bg-red-500/20', desc: 'Major radio blackouts on sunlit side. Radiation storm possible. Aurora likely at high latitudes.' };
  if (letter === 'M') return { label: 'M-class — Moderate', color: 'text-orange-400', bg: 'bg-orange-500/20', desc: 'Radio blackouts on sunlit side of Earth. Minor radiation storm possible.' };
  if (letter === 'C') return { label: 'C-class — Weak', color: 'text-yellow-400', bg: 'bg-yellow-500/20', desc: 'Minor impact. Slight radio disruptions possible. No significant effects expected.' };
  return { label: `${classType} — Very Weak`, color: 'text-green-400', bg: 'bg-green-500/20', desc: 'No significant effects expected.' };
}

const Alerts = () => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [cmeEvents, setCmeEvents] = useState<CmeEvent[]>([]);
  const [flareEvents, setFlareEvents] = useState<FlareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const [noaaData, cmeData, flareData] = await Promise.allSettled([
      getAlerts(),
      getDonkiCme(),
      getDonkiFlares(),
    ]);
    const anySucceeded = [noaaData, cmeData, flareData].some(r => r.status === 'fulfilled');
    if (!anySucceeded) {
      setFetchError(true);
      setLoading(false);
      return;
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

  const getSeverityInfo = (message: string) => {
    const upper = message.toUpperCase();
    if (upper.includes('WARNING') || upper.includes('SEVERE') || upper.includes('EXTREME')) {
      return {
        severity: t('alerts.severityWarning'),
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: <AlertOctagon className="w-5 h-5" />,
      };
    }
    if (upper.includes('WATCH') || upper.includes('ALERT')) {
      return {
        severity: t('alerts.severityWatch'),
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: <AlertTriangle className="w-5 h-5" />,
      };
    }
    if (upper.includes('SUMMARY') || upper.includes('EXTENDED')) {
      return {
        severity: t('alerts.severityInfo'),
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: <Info className="w-5 h-5" />,
      };
    }
    return {
      severity: t('alerts.severityAdvisory'),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: <ShieldAlert className="w-5 h-5" />,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center glass-surface rounded-2xl p-10 border border-white/10 max-w-sm w-full">
          <AlertOctagon className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg mb-2">{t('alerts.fetchError') || 'Could not load alerts'}</h2>
          <p className="text-[#64748b] text-sm mb-6">{t('alerts.fetchErrorDesc') || 'NOAA servers may be temporarily unavailable.'}</p>
          <button
            onClick={fetchAlerts}
            className="px-5 py-2.5 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-sm font-medium hover:bg-[#ef4444]/30 transition-colors"
          >
            {t('alerts.retry') || 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  const earthCmes = cmeEvents.filter(c => {
    const a = c.cmeAnalyses?.find(x => x.isMostAccurate) ?? c.cmeAnalyses?.[0];
    return a?.enlilList?.[0]?.isEarthGB;
  });

  return (
    <div className="min-h-screen pt-20 pb-24 md:pt-24">
      <PageMeta
        title="Space Weather Alerts — The Storm Watcher"
        description="Real-time NOAA space weather alerts, coronal mass ejections and solar flare events."
        path="/alerts"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">{t('alerts.title')}</h1>
          <p className="text-gray-400 text-sm">{t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}</p>
        </div>

        {/* Status summary */}
        {alerts.length === 0 && earthCmes.length === 0 ? (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-2xl px-5 py-4 mb-6">
            <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
            <div>
              <p className="text-green-300 font-semibold">{t('alerts.allClear')}</p>
              <p className="text-green-400/70 text-sm">{t('alerts.noActiveAlerts')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 mb-6">
            {alerts.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 rounded-full px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 text-sm font-semibold">{alerts.length} NOAA {alerts.length === 1 ? 'Alert' : 'Alerts'}</span>
              </div>
            )}
            {earthCmes.length > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-full px-4 py-2">
                <Wind className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm font-semibold">{earthCmes.length} Earth-Directed CME</span>
              </div>
            )}
          </div>
        )}

        {/* NOAA Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3 mb-8">
            {alerts.map((alert, index) => {
              const si = getSeverityInfo(alert.message);
              const { product, issued, summary } = parseNoaaMessage(alert.message);
              const title = friendlyProduct(product);
              const isOpen = expanded[index];
              return (
                <div key={index} className={`${si.bgColor} border ${si.borderColor} rounded-2xl overflow-hidden`}>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${si.bgColor} rounded-xl flex items-center justify-center shrink-0 ${si.color} mt-0.5`}>
                        {si.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${si.color} ${si.bgColor}`}>
                            {si.severity}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-base leading-snug">{title}</h3>
                        <p className="text-[#94a3b8] text-xs mt-1">
                          {issued ?? new Date(alert.issue_datetime).toLocaleString()}
                        </p>
                        {summary && (
                          <p className="text-gray-300 text-sm mt-2 leading-relaxed">{summary}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [index]: !e[index] }))}
                    className="w-full flex items-center justify-between px-5 py-2.5 border-t border-white/8 text-[#64748b] hover:text-white text-xs transition-colors"
                  >
                    <span>Full technical message</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4">
                      <pre className="text-[#94a3b8] text-xs leading-relaxed whitespace-pre-wrap font-mono bg-black/20 rounded-xl p-4 overflow-x-auto">
                        {alert.message}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CME Events */}
        {cmeEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#f97316] to-[#ef4444] rounded-xl flex items-center justify-center">
                <Wind className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t('alerts.cme')}</h2>
                <p className="text-[#94a3b8] text-xs">{t('alerts.donkiLast7')}</p>
              </div>
            </div>
            <div className="space-y-3">
              {cmeEvents.slice(-10).reverse().map((cme) => {
                const analysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) ?? cme.cmeAnalyses?.[0];
                const enlil = analysis?.enlilList?.[0];
                const isEarthDirected = enlil?.isEarthGB;
                const arrivalDate = enlil?.estimatedShockArrivalTime ? new Date(enlil.estimatedShockArrivalTime) : null;
                const now = new Date();
                const hoursUntil = arrivalDate ? Math.round((arrivalDate.getTime() - now.getTime()) / 36e5) : null;
                return (
                  <div
                    key={cme.activityID}
                    className={`rounded-2xl p-5 border ${
                      isEarthDirected
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isEarthDirected ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-[#94a3b8]'
                      }`}>
                        <Wind className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {isEarthDirected && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/25 text-orange-300">
                              🌍 {t('alerts.earthDirected')}
                            </span>
                          )}
                          {analysis?.speed && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white">
                              {analysis.speed.toFixed(0)} km/s
                            </span>
                          )}
                          {cme.sourceLocation && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/5 text-[#94a3b8]">
                              {cme.sourceLocation}
                            </span>
                          )}
                        </div>
                        <p className="text-[#94a3b8] text-xs mb-2">
                          Ejected: {new Date(cme.startTime).toLocaleString()}
                        </p>
                        {arrivalDate && (
                          <div className={`rounded-xl px-4 py-3 mt-2 ${hoursUntil !== null && hoursUntil > 0 ? 'bg-orange-500/15 border border-orange-500/25' : 'bg-white/5 border border-white/10'}`}>
                            <p className="text-orange-200 text-sm font-semibold">
                              {hoursUntil !== null && hoursUntil > 0
                                ? `⏱ Arriving in ~${hoursUntil}h — ${arrivalDate.toLocaleString()}`
                                : `Arrived: ${arrivalDate.toLocaleString()}`}
                            </p>
                            {enlil?.kp_90 && (
                              <p className="text-orange-300/70 text-xs mt-1">
                                {t('alerts.expectedKp')}: {enlil.kp_90} — {Number(enlil.kp_90) >= 5 ? 'Aurora possible at mid-latitudes' : 'Aurora at high latitudes only'}
                              </p>
                            )}
                          </div>
                        )}
                        {cme.note && (
                          <p className="text-[#94a3b8] text-sm mt-2 leading-relaxed line-clamp-3">{cme.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Solar Flares */}
        {flareEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#fbbf24] to-[#f97316] rounded-xl flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t('alerts.solarFlares')}</h2>
                <p className="text-[#94a3b8] text-xs">{t('alerts.donkiLast7')}</p>
              </div>
            </div>

            {/* Flare class legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { l: 'X', c: 'text-red-400', b: 'bg-red-500/15', d: 'Extreme' },
                { l: 'M', c: 'text-orange-400', b: 'bg-orange-500/15', d: 'Moderate' },
                { l: 'C', c: 'text-yellow-400', b: 'bg-yellow-500/15', d: 'Weak' },
                { l: 'B/A', c: 'text-green-400', b: 'bg-green-500/15', d: 'Negligible' },
              ].map(({ l, c, b, d }) => (
                <span key={l} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${b}`}>
                  <Zap className={`w-3 h-3 ${c}`} />
                  <span className={`font-bold ${c}`}>{l}</span>
                  <span className="text-[#94a3b8]">{d}</span>
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {flareEvents.slice(-10).reverse().map((flare) => {
                const fi = flareInfo(flare.classType);
                return (
                  <div key={flare.flrID} className={`rounded-2xl p-5 border ${fi.bg} border-white/10`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${fi.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        <Flame className={`w-5 h-5 ${fi.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${fi.bg} ${fi.color}`}>
                            {fi.label}
                          </span>
                          {flare.sourceLocation && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/5 text-[#94a3b8]">
                              {flare.sourceLocation}
                            </span>
                          )}
                        </div>
                        <p className="text-[#94a3b8] text-xs mb-2">
                          {new Date(flare.beginTime).toLocaleString()}
                        </p>
                        <p className="text-gray-300 text-sm leading-relaxed">{fi.desc}</p>
                        {flare.note && (
                          <p className="text-[#64748b] text-xs mt-2 leading-relaxed line-clamp-2">{flare.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* About section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-3">{t('alerts.aboutTitle')}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">{t('alerts.aboutText')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-white text-sm font-semibold mb-2">{t('alerts.typesTitle')}</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /><span className="text-red-400">{t('alerts.warning')}</span></li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" /><span className="text-orange-400">{t('alerts.watch')}</span></li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /><span className="text-blue-400">{t('alerts.summary')}</span></li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /><span className="text-green-400">{t('alerts.advisory')}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-2">{t('alerts.eventsTitle')}</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>• {t('alerts.geomagnetic')}</li>
                <li>• {t('alerts.radiation')}</li>
                <li>• {t('alerts.radio')}</li>
                <li>• {t('alerts.proton')}</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Alerts;
