import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Zap, Radio, Calendar, Bot, Globe, Bell, Camera, Trophy, Video, Share2, Copy, Twitter, ImageDown, Users } from 'lucide-react';
import { track } from '@vercel/analytics';
import { generateStormScoreImage } from '../utils/generateStormImage';
import { getKpIndex, getSolarWind, getXrayFlux, getXrayClass, getStormStatus, getKpGradientStyle, getKpHistory3Day } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';
import { Skeleton } from '../components/Skeleton';
import { supabase } from '../lib/supabase';

const getScoreShareStatus = (score: number) => {
  if (score <= 25) return 'Quiet';
  if (score <= 50) return 'Unsettled';
  if (score <= 75) return 'Storm';
  return 'Severe Storm';
};

const Home = () => {
  const { t } = useLanguage();
  const [kpValue, setKpValue] = useState<number | null>(null);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [xrayClass, setXrayClass] = useState<string | null>(null);
  const [kpSparkData, setKpSparkData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pulseData, setPulseData] = useState<{ mood: string; symptom: string; count: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState('');
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await supabase
          .from('mood_entries')
          .select('mood_type, symptoms')
          .gte('created_at', twentyFourHoursAgo.toISOString());

        if (error) throw error;
        if (data && data.length > 0) {
          const moodCounts: Record<string, number> = {};
          const symptomCounts: Record<string, number> = {};
          
          data.forEach(entry => {
            moodCounts[entry.mood_type] = (moodCounts[entry.mood_type] || 0) + 1;
            entry.symptoms?.forEach((s: string) => {
              symptomCounts[s] = (symptomCounts[s] || 0) + 1;
            });
          });

          const moodEntries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
          const topMood = moodEntries.length > 0 ? moodEntries[0][0] : 'neutral';
          const topSymptom = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
          
          setPulseData({ mood: topMood, symptom: topSymptom, count: data.length });
        }
      } catch (err) {
        console.error('Error fetching pulse:', err);
      }
    };

    const fetchAll = async () => {
      try {
        await Promise.all([
          (async () => {
            const kpData = await getKpIndex();
            if (kpData && kpData.length > 0) {
              const latest = kpData[kpData.length - 1];
              setKpValue(latest.kp_index || latest.estimated_kp || 0);
            } else {
              setKpValue(0);
            }
          })(),
          (async () => {
            const windData = await getSolarWind();
            if (windData && windData.length > 0) {
              setWindSpeed(windData[windData.length - 1].proton_speed || 0);
            }
          })(),
          (async () => {
            const xrayData = await getXrayFlux();
            if (xrayData && xrayData.length > 0) {
              setXrayClass(getXrayClass(xrayData[xrayData.length - 1].flux || 0));
            }
          })(),
          (async () => {
            const historyData = await getKpHistory3Day();
            if (historyData && historyData.length > 0) {
              setKpSparkData(historyData.slice(-24).map(d => d.Kp));
            }
          })(),
          fetchPulse(),
        ]);
        setLoading(false);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching data:', error);
        setKpValue(0);
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update "time ago" every 10 seconds
  useEffect(() => {
    const tick = () => {
      if (!lastUpdated) return;
      const seconds = Math.round((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, [lastUpdated]);


  const stormStatus = kpValue !== null ? getStormStatus(kpValue) : null;
  const isStorm = kpValue !== null && kpValue >= 5;

  const KpSparkline = ({ data }: { data: number[] }) => {
    if (data.length < 2) return null;
    const w = 200, h = 40;
    const pts = data.map((v, i) =>
      `${((i / (data.length - 1)) * w).toFixed(1)},${(h - (Math.min(v, 9) / 9) * h).toFixed(1)}`
    ).join(' ');
    const max = Math.max(...data);
    const color = max >= 5 ? '#f97316' : max >= 3 ? '#eab308' : '#10b981';
    return (
      <div className="flex flex-col items-center gap-1 mt-4">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          <polyline points={pts} fill="none" stroke="url(#sparkGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest">3-day Kp trend</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative">
      <Helmet>
        <title>
          {kpValue !== null && kpValue >= 5
            ? `⚠️ Solar Storm Alert: Kp ${kpValue.toFixed(1)} | Real-Time Space Weather`
            : `Live Kp Index: ${kpValue?.toFixed(1) ?? '0.0'} | Real-Time Aurora & Space Weather Forecast`}
        </title>
        <link rel="canonical" href={window.location.origin + window.location.pathname} />
        <meta 
          name="description" 
          content={kpValue !== null 
            ? `Monitor current solar activity: Kp index ${kpValue.toFixed(1)}. Track real-time solar wind speeds, X-ray flares, and geomagnetic storm alerts to plan your aurora hunting.`
            : "Get live space weather updates. Track Kp index, solar wind, and geomagnetic storm alerts in real-time. The ultimate dashboard for aurora hunters and space weather enthusiasts."
          } 
        />
        <meta property="og:title" content={kpValue !== null && kpValue >= 5 ? `⚠️ LIVE ALERT: Geomagnetic Storm Kp ${kpValue.toFixed(1)}` : "The Storm Watcher — Real-Time Space Weather Dashboard"} />
        <meta property="og:description" content={kpValue !== null ? `Current Kp index is ${kpValue.toFixed(1)}. Solar wind is at ${windSpeed?.toFixed(0) || '---'} km/s. See if a storm is coming!` : "Monitor solar activity and aurora forecasts with our professional-grade live dashboard."} />
        <meta name="twitter:title" content={kpValue !== null && kpValue >= 5 ? `⚠️ ALERT: Solar Storm Kp ${kpValue.toFixed(1)}` : "The Storm Watcher"} />
        <script type="application/ld+json">
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "The Storm Watcher",
              "operatingSystem": "Web",
              "applicationCategory": "ScientificApplication",
              "description": "Real-time space weather monitoring and aurora forecasts.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": t('home.faq.q1'),
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('home.faq.a1')
                  }
                },
                {
                  "@type": "Question",
                  "name": t('home.faq.q2'),
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('home.faq.a2')
                  }
                },
                {
                  "@type": "Question",
                  "name": t('home.faq.q3'),
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('home.faq.a3')
                  }
                },
                {
                  "@type": "Question",
                  "name": t('home.faq.q4'),
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('home.faq.a4')
                  }
                }
              ]
            }
          ])}
        </script>
      </Helmet>
      <StarField />

      <div className="solar-orb" style={{ top: '-200px', right: '-200px' }} />
      <div className="magnetic-orb" style={{ bottom: '-150px', left: '-150px' }} />

      <div className="relative overflow-hidden">

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 sm:pt-44 sm:pb-32">
          <div className="text-center">

            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-surface border border-[#f97316]/30 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[#94a3b8] text-sm font-semibold uppercase tracking-widest">Live Space Weather</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold mb-6 gradient-solar">
              The Storm Watcher
            </h1>

            <p className="text-2xl sm:text-3xl text-white font-semibold mb-4">
              {t('home.hero.tagline')}
            </p>

            <p className="text-lg text-[#94a3b8] mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('home.hero.desc')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link
                to="/auth"
                className="px-8 py-4 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white rounded-lg font-bold uppercase tracking-wider hover:scale-105 transition-transform glow-orange"
              >
                {t('home.hero.getStarted')}
              </Link>
              <Link
                to="/dashboard"
                className="px-8 py-4 glass-surface text-white rounded-lg font-bold uppercase tracking-wider hover:glow-orange transition-all border border-white/10"
              >
                {t('home.hero.viewMap')}
              </Link>
            </div>

            {/* Live Kp */}
            {loading ? (
              <div className="my-8 flex flex-col items-center gap-4">
                {/* Adjusted height to match 8xl (96px) and 160px text more closely to prevent CLS */}
                <Skeleton className="w-40 h-24 sm:w-64 sm:h-40 rounded-2xl" />
                <Skeleton className="w-48 h-8 rounded-full" />
                <div className="flex gap-3 mt-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="w-24 h-8 rounded-xl" />)}
                </div>
              </div>
            ) : (
              <div className="my-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
                  </span>
                  <span className="text-xs text-[#64748b] uppercase tracking-widest font-semibold">Live · Kp Index</span>
                  {timeAgo && <span className="text-xs text-[#475569]">· {timeAgo}</span>}
                </div>
                <div className={`inline-block ${isStorm ? 'pulse-alert' : ''}`}>
                  <div
                    className="text-8xl sm:text-[160px] font-bold leading-none"
                    style={getKpGradientStyle(kpValue ?? 0)}
                  >
                    {kpValue?.toFixed(1) ?? '0.0'}
                  </div>
                </div>

                {stormStatus && (
                  <div className={`inline-flex items-center gap-2 px-8 py-4 rounded-full mt-6 ${
                    kpValue! >= 7 ? 'pulse-alert bg-gradient-to-r from-[#ef4444] to-[#dc2626] border-2 border-[#ef4444]' :
                    kpValue! >= 5 ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] border-2 border-[#f97316]' :
                    kpValue! >= 4 ? 'bg-gradient-to-r from-[#eab308] to-[#ca8a04] border-2 border-[#eab308]' :
                    'bg-gradient-to-r from-[#10b981] to-[#059669] border-2 border-[#10b981]'
                  }`}>
                    {kpValue! >= 5 && <AlertTriangle className="w-6 h-6 text-white" />}
                    <span className="text-white font-bold text-xl uppercase tracking-wider">
                      {t(stormStatus.statusKey)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {!loading && (
              <>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <div className="glass-surface rounded-xl px-5 py-3 flex items-center gap-3">
                    <Activity className="w-4 h-4 text-[#f97316]" />
                    <span className="text-[#94a3b8] text-sm uppercase tracking-wider">Kp</span>
                    <span className="text-white font-bold">{kpValue?.toFixed(1)}</span>
                  </div>
                  {windSpeed !== null && windSpeed > 0 && (
                    <div className="glass-surface rounded-xl px-5 py-3 flex items-center gap-3">
                      <Zap className="w-4 h-4 text-[#7c3aed]" />
                      <span className="text-[#94a3b8] text-sm uppercase tracking-wider">Solar Wind</span>
                      <span className="text-white font-bold">{windSpeed.toFixed(0)} km/s</span>
                    </div>
                  )}
                  {xrayClass && (
                    <div className="glass-surface rounded-xl px-5 py-3 flex items-center gap-3">
                      <Radio className="w-4 h-4 text-[#fbbf24]" />
                      <span className="text-[#94a3b8] text-sm uppercase tracking-wider">X-ray</span>
                      <span className="text-white font-bold">Class {xrayClass}</span>
                    </div>
                  )}
                </div>
                {kpSparkData.length > 1 && <KpSparkline data={kpSparkData} />}

                {/* Community Pulse Widget */}
                <div className="mt-12 flex justify-center">
                  <Link 
                    to="/mood"
                    className="glass-surface rounded-2xl px-6 py-4 border border-white/5 hover:border-[#f97316]/30 transition-all group max-w-sm"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-[#f97316]" />
                      </div>
                      <div>
                        <div className="text-xs text-[#64748b] uppercase tracking-widest font-bold mb-0.5">
                          {t('home.pulse.title')}
                        </div>
                        {pulseData ? (
                          <>
                            <div className="text-white font-semibold text-sm leading-tight">
                              {pulseData.symptom 
                                ? `${t('home.pulse.topSymptom')}: ${t(pulseData.symptom)}`
                                : `${t('home.pulse.mostCommon')}: ${t(`mood.${pulseData.mood}`)}`}
                            </div>
                            <div className="text-[10px] text-[#475569] mt-1 uppercase tracking-wide">
                              {pulseData.count} {t('home.pulse.participants')} · 24h
                            </div>
                          </>
                        ) : (
                          <div className="text-[#475569] text-xs italic">
                            {t('home.pulse.noData')}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Storm Score */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-surface rounded-3xl p-10 border border-[#f97316]/10 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 uppercase tracking-wide">
            {t('home.stormScore.title')}
          </h2>
          <p className="text-[#94a3b8] max-w-xl mx-auto mb-10 leading-relaxed">
            {t('home.stormScore.desc')}
          </p>

          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl" />
              <Skeleton className="w-40 h-5 rounded" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Score number + share button */}
              <div className="flex items-center gap-4">
                <div
                  className="text-8xl sm:text-[120px] font-bold leading-none"
                  style={getKpGradientStyle(kpValue ?? 0)}
                >
                  {kpValue !== null ? Math.round((kpValue / 9) * 100) : 0}
                </div>
                <div className="relative self-start mt-4" ref={shareRef}>
                  <button
                    onClick={() => setShareOpen(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-surface border border-white/10 text-[#94a3b8] hover:text-white hover:border-[#f97316]/40 transition-all text-sm font-medium"
                    title="Share Storm Score"
                  >
                    <Share2 className="w-4 h-4" />
                    {t('home.stormScore.share')}
                  </button>
                  {shareOpen && (() => {
                    const score = kpValue !== null ? Math.round((kpValue / 9) * 100) : 0;
                    const status = getScoreShareStatus(score);
                    const text = `🌌 Storm Score is ${score}/100 right now! Space weather is ${status}. Track it live at thestormwatcher.com #aurora #spaceweather`;
                    return (
                      <div className="absolute left-0 mt-2 w-52 glass-surface rounded-xl shadow-2xl py-2 border border-[#f97316]/20 z-20">
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { track('storm_score_shared', { method: 'twitter', score }); setShareOpen(false); }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Twitter className="w-4 h-4 text-[#1d9bf0]" />
                          {t('home.stormScore.shareX')}
                        </a>
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://thestormwatcher.com')}&quote=${encodeURIComponent(text)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShareOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Globe className="w-4 h-4 text-[#1877f2]" />
                          {t('home.stormScore.shareFb')}
                        </a>
                        <button
                          onClick={() => {
                            track('storm_score_shared', { method: 'copy', score });
                            navigator.clipboard.writeText('https://thestormwatcher.com');
                            setCopied(true);
                            setTimeout(() => { setCopied(false); setShareOpen(false); }, 1500);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Copy className="w-4 h-4 text-[#10b981]" />
                          {copied ? t('home.stormScore.copied') : t('home.stormScore.copy')}
                        </button>
                        <button
                          onClick={async () => {
                            track('storm_score_shared', { method: 'image', score });
                            setShareOpen(false);
                            const blob = await generateStormScoreImage({
                              score,
                              status,
                              kp: kpValue ?? 0,
                              windSpeed,
                              xrayClass,
                              communityMood: pulseData?.mood ? t(`mood.${pulseData.mood}`) : undefined,
                              communitySymptom: pulseData?.symptom ? t(pulseData.symptom) : undefined,
                            });
                            if (navigator.canShare?.({ files: [new File([blob], 'storm-score.png', { type: 'image/png' })] })) {
                              await navigator.share({ files: [new File([blob], 'storm-score.png', { type: 'image/png' })] });
                            } else {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `storm-score-${score}.png`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <ImageDown className="w-4 h-4 text-[#7c3aed]" />
                          {t('home.stormScore.saveImage') || 'Save as image'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-lg">
                <div className="flex justify-between text-xs text-[#64748b] uppercase tracking-widest mb-2">
                  <span>{t('home.stormScore.quiet')}</span>
                  <span>{t('home.stormScore.unsettled')}</span>
                  <span>{t('home.stormScore.storm')}</span>
                  <span>{t('home.stormScore.severe')}</span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${kpValue !== null ? Math.round((kpValue / 9) * 100) : 0}%`,
                      background: kpValue !== null && kpValue >= 7
                        ? 'linear-gradient(to right, #ef4444, #dc2626)'
                        : kpValue !== null && kpValue >= 5
                        ? 'linear-gradient(to right, #f97316, #ef4444)'
                        : kpValue !== null && kpValue >= 4
                        ? 'linear-gradient(to right, #eab308, #f97316)'
                        : 'linear-gradient(to right, #10b981, #059669)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#64748b] mt-1">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What does this mean for me? */}
      {!loading && kpValue !== null && (() => {
        const score = Math.round((kpValue / 9) * 100);
        const meanings = [
          { max: 25, emoji: '🌙', text: t('home.meaningQuiet'), color: 'from-[#10b981]/20 to-[#059669]/10', border: 'border-[#10b981]/30', accent: '#10b981' },
          { max: 50, emoji: '⚡', text: t('home.meaningModerate'), color: 'from-[#eab308]/20 to-[#ca8a04]/10', border: 'border-[#eab308]/30', accent: '#eab308' },
          { max: 75, emoji: '🌌', text: t('home.meaningStorm'), color: 'from-[#f97316]/20 to-[#ea580c]/10', border: 'border-[#f97316]/30', accent: '#f97316' },
          { max: 100, emoji: '🔴', text: t('home.meaningStrong'), color: 'from-[#ef4444]/20 to-[#dc2626]/10', border: 'border-[#ef4444]/30', accent: '#ef4444' },
        ];
        const m = meanings.find(x => score <= x.max) ?? meanings[3];
        return (
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className={`rounded-2xl p-8 bg-gradient-to-r ${m.color} border ${m.border} text-center`}>
              <p className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: m.accent }}>
                {t('home.meaning')}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {m.emoji} {m.text}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Features */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 uppercase tracking-wide">
            {t('home.features2.title')}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-surface rounded-2xl p-7 hover:glow-green transition-all group">
            <div className="w-14 h-14 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.calendar.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.calendar.desc')}</p>
          </div>

          <div className="glass-surface rounded-2xl p-7 hover:glow-purple transition-all group relative opacity-60">
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30">{t('home.comingSoon')}</span>
            <div className="w-14 h-14 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.ai.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.ai.desc')}</p>
          </div>

          <div className="glass-surface rounded-2xl p-7 hover:glow-orange transition-all group">
            <div className="w-14 h-14 bg-gradient-to-br from-[#f97316] to-[#ef4444] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.map.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.map.desc')}</p>
          </div>

          <div className="glass-surface rounded-2xl p-7 hover:glow-orange transition-all group relative opacity-60">
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30">{t('home.comingSoon')}</span>
            <div className="w-14 h-14 bg-gradient-to-br from-[#fbbf24] to-[#f97316] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.alerts.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.alerts.desc')}</p>
          </div>

          <div className="glass-surface rounded-2xl p-7 hover:glow-green transition-all group relative opacity-60">
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#06b6d4]/20 text-[#22d3ee] border border-[#06b6d4]/30">{t('home.comingSoon')}</span>
            <div className="w-14 h-14 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.gallery.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.gallery.desc')}</p>
          </div>

          <div className="glass-surface rounded-2xl p-7 hover:glow-orange transition-all group relative opacity-60">
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/30">{t('home.comingSoon')}</span>
            <div className="w-14 h-14 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.hunt.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.hunt.desc')}</p>
          </div>

          <div className="glass-surface rounded-2xl p-7 hover:glow-purple transition-all group relative opacity-60">
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#ec4899]/20 text-[#f472b6] border border-[#ec4899]/30">{t('home.comingSoon')}</span>
            <div className="w-14 h-14 bg-gradient-to-br from-[#ec4899] to-[#be185d] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Video className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('home.feature.livestream.title')}</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{t('home.feature.livestream.desc')}</p>
          </div>

        </div>
      </div>
      {/* Data Sources */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-surface rounded-3xl p-10 border border-white/10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 uppercase tracking-wide">
            {t('home.trustedSources')}
          </h2>
          <p className="text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('home.trustedSourcesDesc')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'NOAA SWPC', sub: 'Space Weather Prediction Center', color: 'from-[#0ea5e9] to-[#0284c7]', flag: '🇺🇸' },
              { name: 'NASA DONKI', sub: 'Space Weather Database', color: 'from-[#6366f1] to-[#4f46e5]', flag: '🇺🇸' },
              { name: 'GFZ Potsdam', sub: 'Official Kp Index Authority', color: 'from-[#f59e0b] to-[#d97706]', flag: '🇩🇪' },
              { name: 'ESA', sub: 'Space Weather Service', color: 'from-[#10b981] to-[#059669]', flag: '🇪🇺' },
              { name: 'NIGGG', sub: 'Bulgaria Geophysics Institute', color: 'from-[#f97316] to-[#ea580c]', flag: '🇧🇬' },
            ].map(source => (
              <div key={source.name} className="glass-surface rounded-xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-2xl font-bold bg-gradient-to-br ${source.color} bg-clip-text text-transparent`}>
                    {source.name}
                  </div>
                  <span className="text-2xl">{source.flag}</span>
                </div>
                <div className="text-[#64748b] text-xs leading-snug">{source.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 uppercase tracking-wide">
            {t('home.faq.title')}
          </h2>
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-surface rounded-2xl p-8 border border-white/5">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-sm font-bold">?</span>
                {t(`home.faq.q${i}`)}
              </h3>
              <p className="text-[#94a3b8] leading-relaxed">
                {t(`home.faq.a${i}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
