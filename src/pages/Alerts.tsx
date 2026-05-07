import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Info, AlertOctagon, ShieldAlert, Flame, Wind, Activity } from 'lucide-react';
import { getAlerts, Alert as AlertType } from '../services/noaaApi';
import { getDonkiCme, getDonkiFlares, getDonkiGst, CmeEvent, FlareEvent, GstEvent } from '../services/donkiApi';
import { useLanguage } from '../contexts/LanguageContext';
import { logError } from '../utils/logger';

const kpToGScale = (kp: number): { scale: string; label: string; color: string; bg: string; border: string } => {
  if (kp >= 9) return { scale: 'G5', label: 'Extreme',  color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/30' };
  if (kp >= 8) return { scale: 'G4', label: 'Severe',   color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
  if (kp >= 7) return { scale: 'G3', label: 'Strong',   color: '#fbbf24', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
  if (kp >= 6) return { scale: 'G2', label: 'Moderate', color: '#84cc16', bg: 'bg-lime-500/10',   border: 'border-lime-500/30' };
  return             { scale: 'G1', label: 'Minor',    color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
};

const eventTypeLabel = (activityID: string): string => {
  if (activityID.includes('-CME-')) return 'CME';
  if (activityID.includes('-HSS-')) return 'High Speed Stream';
  if (activityID.includes('-IPS-')) return 'Interplanetary Shock';
  if (activityID.includes('-FLR-')) return 'Solar Flare';
  return 'Solar Event';
};

const Alerts = () => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [cmeEvents, setCmeEvents] = useState<CmeEvent[]>([]);
  const [flareEvents, setFlareEvents] = useState<FlareEvent[]>([]);
  const [gstEvents, setGstEvents] = useState<GstEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [noaaData, cmeData, flareData, gstData] = await Promise.allSettled([
          getAlerts(),
          getDonkiCme(),
          getDonkiFlares(),
          getDonkiGst(),
        ]);
        if (noaaData.status === 'fulfilled') setAlerts(noaaData.value || []);
        if (cmeData.status === 'fulfilled') setCmeEvents(cmeData.value || []);
        if (flareData.status === 'fulfilled') setFlareEvents(flareData.value || []);
        if (gstData.status === 'fulfilled') setGstEvents((gstData.value || []).slice().reverse());
        setLastUpdated(new Date());
        setLoading(false);
      } catch (error) {
        logError('Error fetching alerts', error);
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(() => { if (document.visibilityState !== 'hidden') fetchAlerts(); }, 120000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 md:pt-24">
      <Helmet>
        <title>Space Weather Alerts — The Storm Watcher</title>
        <meta name="description" content="Real-time NOAA space weather alerts, coronal mass ejections and solar flare events." />
        <link rel="canonical" href="https://thestormwatcher.com/alerts" />
        <meta property="og:title" content="Space Weather Alerts — The Storm Watcher" />
        <meta property="og:description" content="Real-time NOAA space weather alerts, coronal mass ejections and solar flare events." />
        <meta property="og:url" content="https://thestormwatcher.com/alerts" />
        <meta name="twitter:title" content="Space Weather Alerts — The Storm Watcher" />
        <meta name="twitter:description" content="Real-time NOAA space weather alerts, coronal mass ejections and solar flare events." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">{t('alerts.title')}</h1>
          <p className="text-gray-400">
            {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-12 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg sm:text-2xl font-semibold text-white mb-1 sm:mb-2">{t('alerts.allClear')}</h3>
              <p className="text-gray-400">{t('alerts.noActiveAlerts')}</p>
            </div>
          ) : (
            alerts.map((alert, index) => {
              const severityInfo = getSeverityInfo(alert.message);
              return (
                <div
                  key={index}
                  className={`${severityInfo.bgColor} backdrop-blur-sm border ${severityInfo.borderColor} rounded-2xl p-6`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className={`w-12 h-12 ${severityInfo.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 ${severityInfo.color}`}>
                      {severityInfo.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${severityInfo.color} ${severityInfo.bgColor}`}>
                          {severityInfo.severity}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(alert.issue_datetime).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-white whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {alert.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* NASA DONKI — CME Events */}
        {cmeEvents.length > 0 && (
          <div className="mt-6 sm:mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#f97316] to-[#ef4444] rounded-lg flex items-center justify-center">
                <Wind className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">{t('alerts.cme')}</h2>
                <p className="text-[#94a3b8] text-sm">{t('alerts.donkiLast7')}</p>
              </div>
            </div>
            <div className="space-y-4">
              {cmeEvents.slice(-10).reverse().map((cme) => {
                const analysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) ?? cme.cmeAnalyses?.[0];
                const enlil = analysis?.enlilList?.[0];
                const isEarthDirected = enlil?.isEarthGB;
                return (
                  <div
                    key={cme.activityID}
                    className={`backdrop-blur-sm border rounded-2xl p-6 ${
                      isEarthDirected
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isEarthDirected ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-[#94a3b8]'
                      }`}>
                        <Wind className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {isEarthDirected && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">
                              {t('alerts.earthDirected')}
                            </span>
                          )}
                          {analysis?.speed && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                              {analysis.speed.toFixed(0)} km/s
                            </span>
                          )}
                          {cme.sourceLocation && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#94a3b8]">
                              {cme.sourceLocation}
                            </span>
                          )}
                          <span className="text-[#64748b] text-xs">
                            {new Date(cme.startTime).toLocaleString()}
                          </span>
                        </div>
                        {enlil?.estimatedShockArrivalTime && (
                          <p className="text-orange-300 text-sm mb-2 font-semibold">
                            {t('alerts.estimatedArrival')}: {new Date(enlil.estimatedShockArrivalTime).toLocaleString()}
                            {enlil.kp_90 && ` · ${t('alerts.expectedKp')}: ${enlil.kp_90}`}
                          </p>
                        )}
                        {cme.note && (
                          <p className="text-[#94a3b8] text-sm leading-relaxed line-clamp-3">{cme.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NASA DONKI — Solar Flares */}
        {flareEvents.length > 0 && (
          <div className="mt-6 sm:mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#fbbf24] to-[#f97316] rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">{t('alerts.solarFlares')}</h2>
                <p className="text-[#94a3b8] text-sm">{t('alerts.donkiLast7')}</p>
              </div>
            </div>
            <div className="space-y-4">
              {flareEvents.slice(-10).reverse().map((flare) => (
                <div key={flare.flrID} className="bg-yellow-500/5 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0 text-yellow-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">
                          Class {flare.classType}
                        </span>
                        {flare.sourceLocation && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#94a3b8]">
                            {flare.sourceLocation}
                          </span>
                        )}
                        <span className="text-[#64748b] text-xs">
                          {new Date(flare.beginTime).toLocaleString()}
                        </span>
                      </div>
                      {flare.note && (
                        <p className="text-[#94a3b8] text-sm leading-relaxed line-clamp-3">{flare.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geomagnetic Storm History — last 30 days */}
        <div className="mt-6 sm:mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white">Geomagnetic Storm History</h2>
              <p className="text-[#94a3b8] text-sm">Last 30 days · DONKI / NOAA</p>
            </div>
          </div>

          {/* Summary pill */}
          {gstEvents.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="glass-surface rounded-full px-4 py-2 border border-white/10 text-sm text-white font-semibold">
                {gstEvents.length} storm{gstEvents.length !== 1 ? 's' : ''} recorded
              </div>
              {(() => {
                const peak = Math.max(...gstEvents.flatMap(g => (g.allKpIndex ?? []).map(k => k.kpIndex)));
                const g = kpToGScale(isFinite(peak) ? peak : 5);
                return (
                  <div className="glass-surface rounded-full px-4 py-2 border text-sm font-bold flex items-center gap-1.5"
                    style={{ borderColor: g.color + '50', color: g.color }}>
                    Peak {g.scale} · Kp {peak.toFixed(1)}
                  </div>
                );
              })()}
            </div>
          )}

          {gstEvents.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-white font-semibold mb-1">No geomagnetic storms in the last 30 days</p>
              <p className="text-[#94a3b8] text-sm">Space weather has been quiet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gstEvents.map((gst) => {
                const kpEntries = gst.allKpIndex ?? [];
                const peakKp = kpEntries.length > 0 ? Math.max(...kpEntries.map(k => k.kpIndex)) : 5;
                const g = kpToGScale(peakKp);
                const causes = [...new Set((gst.linkedEvents ?? []).map(e => eventTypeLabel(e.activityID)))];
                const startMs = new Date(gst.startTime).getTime();
                const lastMs = kpEntries.length > 0
                  ? new Date(kpEntries[kpEntries.length - 1].observedTime).getTime()
                  : startMs;
                const durationH = Math.round((lastMs - startMs) / 3600000);
                return (
                  <div key={gst.gstID} className={`backdrop-blur-sm border rounded-2xl p-5 sm:p-6 ${g.bg} ${g.border}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* G-scale badge */}
                      <div className="flex-shrink-0 text-center w-16">
                        <div className="text-3xl font-bold" style={{ color: g.color }}>{g.scale}</div>
                        <div className="text-xs font-semibold" style={{ color: g.color }}>{g.label}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-white font-semibold">
                            {new Date(gst.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[#64748b] text-xs">
                            {new Date(gst.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} UTC
                          </span>
                          {durationH > 0 && (
                            <span className="text-[#64748b] text-xs">· {durationH}h duration</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold border"
                            style={{ borderColor: g.color + '60', color: g.color, background: g.color + '15' }}>
                            Peak Kp {peakKp.toFixed(2)}
                          </span>
                          {causes.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-[#94a3b8] border border-white/10">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Mini Kp sparkline */}
                      {kpEntries.length > 1 && (
                        <div className="flex items-end gap-0.5 h-8 flex-shrink-0">
                          {kpEntries.map((k, i) => {
                            const h = Math.max(2, Math.round((k.kpIndex / 9) * 32));
                            return (
                              <div key={i} className="w-2 rounded-sm" style={{ height: h, background: kpToGScale(k.kpIndex).color }} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-4">{t('alerts.aboutTitle')}</h3>
          <div className="space-y-4 text-gray-400">
            <p>
              {t('alerts.aboutText')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="text-white font-semibold mb-2">{t('alerts.typesTitle')}</h4>
                <ul className="space-y-1 text-sm">
                  <li className="text-red-400">• {t('alerts.warning')}</li>
                  <li className="text-orange-400">• {t('alerts.watch')}</li>
                  <li className="text-blue-400">• {t('alerts.summary')}</li>
                  <li className="text-green-400">• {t('alerts.advisory')}</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">{t('alerts.eventsTitle')}</h4>
                <ul className="space-y-1 text-sm">
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
    </div>
  );
};

export default Alerts;
