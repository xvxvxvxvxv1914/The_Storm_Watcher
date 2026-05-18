import { useEffect, useState } from 'react';
import { logError } from '../utils/logger';
import PageMeta from '../components/PageMeta';
import { Users, TrendingUp, CheckCircle, AlertCircle, ThumbsUp } from 'lucide-react';
import SvgDonut from '../components/charts/SvgDonut';
import SvgStackedBars, { type DataRow } from '../components/charts/SvgStackedBars';
import { supabase, getSessionId } from '../lib/supabase';
import { getKpIndex } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

interface MoodStats {
  mood_type: string;
  count: number;
  percentage: number;
}

interface HourlyData {
  hour: string;
  great: number;
  good: number;
  okay: number;
  bad: number;
  terrible: number;
}

const MoodIconGreat = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <circle cx="32" cy="32" r="10" fill={active ? '#22c55e' : '#22c55e99'} />
    <circle cx="32" cy="32" r="10" fill="url(#gGreat)" opacity="0.6" />
    {[0,45,90,135,180,225,270,315].map((deg, i) => (
      <line key={i}
        x1={32 + 13 * Math.cos(deg * Math.PI / 180)}
        y1={32 + 13 * Math.sin(deg * Math.PI / 180)}
        x2={32 + 20 * Math.cos(deg * Math.PI / 180)}
        y2={32 + 20 * Math.sin(deg * Math.PI / 180)}
        stroke={active ? '#4ade80' : '#22c55e88'} strokeWidth="2.5" strokeLinecap="round"
      />
    ))}
    {[22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].map((deg, i) => (
      <line key={i}
        x1={32 + 13 * Math.cos(deg * Math.PI / 180)}
        y1={32 + 13 * Math.sin(deg * Math.PI / 180)}
        x2={32 + 16 * Math.cos(deg * Math.PI / 180)}
        y2={32 + 16 * Math.sin(deg * Math.PI / 180)}
        stroke={active ? '#86efac' : '#22c55e55'} strokeWidth="1.5" strokeLinecap="round"
      />
    ))}
    <defs>
      <radialGradient id="gGreat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#bbf7d0" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const MoodIconGood = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <circle cx="32" cy="32" r="10" fill={active ? '#10b981' : '#10b98199'} />
    {[0,60,120,180,240,300].map((deg, i) => (
      <line key={i}
        x1={32 + 13 * Math.cos(deg * Math.PI / 180)}
        y1={32 + 13 * Math.sin(deg * Math.PI / 180)}
        x2={32 + 19 * Math.cos(deg * Math.PI / 180)}
        y2={32 + 19 * Math.sin(deg * Math.PI / 180)}
        stroke={active ? '#34d399' : '#10b98188'} strokeWidth="2.5" strokeLinecap="round"
      />
    ))}
    <circle cx="32" cy="32" r="15" stroke={active ? '#34d39940' : '#10b98130'} strokeWidth="1.5" strokeDasharray="3 4" />
  </svg>
);

const MoodIconOkay = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <circle cx="32" cy="32" r="10" fill={active ? '#eab308' : '#eab30899'} />
    <circle cx="32" cy="32" r="16" stroke={active ? '#eab308' : '#eab30855'} strokeWidth="1.5" />
    <circle cx="32" cy="32" r="22" stroke={active ? '#eab30850' : '#eab30825'} strokeWidth="1" />
    <path d="M 20 32 Q 26 26 32 32 Q 38 38 44 32" stroke={active ? '#fde047' : '#eab30888'} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MoodIconBad = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <circle cx="32" cy="32" r="10" fill={active ? '#f97316' : '#f9731699'} />
    <path d="M 14 22 Q 20 28 26 22 Q 32 16 38 22 Q 44 28 50 22" stroke={active ? '#fb923c' : '#f9731666'} strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M 14 42 Q 20 36 26 42 Q 32 48 38 42 Q 44 36 50 42" stroke={active ? '#fb923c' : '#f9731666'} strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M 10 32 Q 18 24 26 32 Q 34 40 42 32 Q 50 24 54 32" stroke={active ? '#f97316' : '#f9731644'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

const MoodIconTerrible = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <circle cx="32" cy="32" r="9" fill={active ? '#ef4444' : '#ef444499'} />
    {[0,1,2,3,4].map(i => {
      const r1 = 13 + i * 4.5;
      const r2 = r1 + 2.5;
      const dash = `${(2 + i) * 1.5} ${2 + i}`;
      return <circle key={i} cx="32" cy="32" r={r1} stroke={active ? `rgba(239,68,68,${0.7 - i * 0.12})` : `rgba(239,68,68,${0.3 - i * 0.05})`} strokeWidth={r2 - r1} strokeDasharray={dash} />;
    })}
    <line x1="24" y1="24" x2="40" y2="40" stroke={active ? '#fca5a5' : '#ef444466'} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="24" x2="24" y2="40" stroke={active ? '#fca5a5' : '#ef444466'} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MOODS = [
  { type: 'great',    labelKey: 'mood.great',    Icon: MoodIconGreat,    ring: 'ring-green-400',   glow: 'shadow-green-500/50',   bg: 'bg-green-500/10',   selectedBg: 'bg-green-500',   selectedRing: 'ring-green-300' },
  { type: 'good',     labelKey: 'mood.good',     Icon: MoodIconGood,     ring: 'ring-emerald-400', glow: 'shadow-emerald-500/50', bg: 'bg-emerald-500/10', selectedBg: 'bg-emerald-500', selectedRing: 'ring-emerald-300' },
  { type: 'okay',     labelKey: 'mood.okay',     Icon: MoodIconOkay,     ring: 'ring-yellow-400',  glow: 'shadow-yellow-500/50',  bg: 'bg-yellow-500/10',  selectedBg: 'bg-yellow-500',  selectedRing: 'ring-yellow-300' },
  { type: 'bad',      labelKey: 'mood.bad',      Icon: MoodIconBad,      ring: 'ring-orange-400',  glow: 'shadow-orange-500/50',  bg: 'bg-orange-500/10',  selectedBg: 'bg-orange-500',  selectedRing: 'ring-orange-300' },
  { type: 'terrible', labelKey: 'mood.terrible', Icon: MoodIconTerrible, ring: 'ring-red-400',     glow: 'shadow-red-500/50',     bg: 'bg-red-500/10',     selectedBg: 'bg-red-500',     selectedRing: 'ring-red-300' },
];

const SYMPTOM_KEYS = [
  'mood.symptom.headache',
  'mood.symptom.dizzy',
  'mood.symptom.anxiety',
  'mood.symptom.insomnia',
  'mood.symptom.fatigue',
  'mood.symptom.irritability',
  'mood.symptom.concentration',
  'mood.symptom.palpitations',
];

const getKpGlow = (kp: number): string => {
  if (kp >= 7) return 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(239,68,68,0.18) 0%, transparent 70%)';
  if (kp >= 5) return 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(249,115,22,0.15) 0%, transparent 70%)';
  if (kp >= 3) return 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(234,179,8,0.12) 0%, transparent 70%)';
  return 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)';
};

const Mood = () => {
  const { t } = useLanguage();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [currentKp, setCurrentKp] = useState<number>(0);
  const [stats, setStats] = useState<MoodStats[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchKp();
    fetchStats();
    checkIfSubmittedToday();
  }, []);

  const fetchKp = async () => {
    try {
      const data = await getKpIndex();
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
        setCurrentKp(latest.kp_index || latest.estimated_kp || 0);
      }
    } catch (error) {
      logError('Error fetching Kp:', error);
    }
  };

  const checkIfSubmittedToday = async () => {
    const sessionId = getSessionId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('mood_entries')
      .select('id, created_at')
      .eq('user_session_id', sessionId)
      .gte('created_at', today.toISOString())
      .maybeSingle();

    setHasSubmittedToday(!!data);
    if (data) setSubmittedAt(new Date((data as { id: string; created_at: string }).created_at));
    setLoading(false);
  };

  const fetchStats = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('mood_entries')
      .select('mood_type, created_at')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (error) {
      logError('Error fetching stats:', error);
      return;
    }

    if (data) {
      const total = data.length;
      setTotalEntries(total);

      const moodCounts: { [key: string]: number } = {};
      data.forEach((entry) => {
        moodCounts[entry.mood_type] = (moodCounts[entry.mood_type] || 0) + 1;
      });

      const statsArray = Object.entries(moodCounts).map(([mood_type, count]) => ({
        mood_type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }));
      statsArray.sort((a, b) => b.count - a.count);
      setStats(statsArray);

      // Build hourly data for last 12 hours
      const hourlyMap: { [key: string]: HourlyData } = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setHours(d.getHours() - i, 0, 0, 0);
        const key = d.getHours().toString().padStart(2, '0') + ':00';
        hourlyMap[key] = { hour: key, great: 0, good: 0, okay: 0, bad: 0, terrible: 0 };
      }
      data.forEach((entry: { mood_type: string; created_at: string }) => {
        const h = new Date(entry.created_at).getHours().toString().padStart(2, '0') + ':00';
        if (hourlyMap[h]) {
          hourlyMap[h][entry.mood_type as keyof Omit<HourlyData, 'hour'>]++;
        }
      });
      setHourlyData(Object.values(hourlyMap));
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;

    const sessionId = getSessionId();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/submit-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          mood_type: selectedMood,
          symptoms: selectedSymptoms,
          kp_index: currentKp,
        }),
      });

      if (res.status === 429) {
        setHasSubmittedToday(true);
        setSubmitMessage({ type: 'error', text: t('mood.alreadySubmitted') });
        return;
      }
      if (!res.ok) throw new Error('submit failed');
    } catch {
      setSubmitMessage({ type: 'error', text: t('mood.error') });
      return;
    }

    setHasSubmittedToday(true);
    setSelectedMood(null);
    setSelectedSymptoms([]);
    fetchStats();
    setSubmitMessage({ type: 'success', text: t('mood.thankYou') });
  };

  const toggleSymptom = (key: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const getMoodInfo = (moodType: string) => MOODS.find((m) => m.type === moodType);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 md:pt-24" style={{ background: getKpGlow(currentKp) }}>
      <PageMeta
        title="Mood Tracker — The Storm Watcher"
        description="Track how geomagnetic storms affect your mood and wellbeing. See community mood patterns correlated with Kp index."
        path="/mood"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">{t('mood.title')}</h1>
          <p className="text-gray-400">{t('mood.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-[#00ff88]" />
              <h3 className="text-gray-400 text-sm">{t('mood.participants')}</h3>
            </div>
            <div className="text-4xl font-bold text-white">{totalEntries}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-[#3b82f6]" />
              <h3 className="text-gray-400 text-sm">{t('mood.currentKp')}</h3>
            </div>
            <div className="text-4xl font-bold text-white">{currentKp.toFixed(1)}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">😊</span>
              <h3 className="text-gray-400 text-sm">{t('mood.topMood')}</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.length > 0 ? t(getMoodInfo(stats[0].mood_type)?.labelKey ?? '') : '-'}
            </div>
          </div>
        </div>

        {submitMessage && (
          <div className={`mb-6 flex items-center gap-3 px-6 py-4 rounded-xl border ${
            submitMessage.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {submitMessage.type === 'success'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{submitMessage.text}</span>
          </div>
        )}

        {!hasSubmittedToday ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">{t('mood.rateTitle')}</h2>

            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood.type;
                return (
                  <button
                    key={mood.type}
                    onClick={() => setSelectedMood(mood.type)}
                    className={`flex flex-col items-center gap-3 transition-all duration-200 group ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                  >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ring-2 shadow-lg transition-all duration-200 ${
                      isSelected
                        ? `${mood.selectedBg}/20 ${mood.selectedRing} ${mood.glow} shadow-xl`
                        : `${mood.bg} ring-white/10 group-hover:${mood.ring}`
                    }`}>
                      <mood.Icon active={isSelected} />
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                      {t(mood.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMood && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {t('mood.symptomsQuestion')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SYMPTOM_KEYS.map((key) => {
                    const isSelected = selectedSymptoms.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleSymptom(key)}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          isSelected
                            ? 'bg-[#00ff88] text-[#0a0a1a] font-semibold'
                            : 'bg-white/5 text-gray-300 border border-white/10 hover:border-white/30'
                        }`}
                      >
                        {t(key)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedMood}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                selectedMood
                  ? 'bg-[#00ff88] text-[#0a0a1a] hover:bg-[#00ff88]/90'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('mood.submit')}
            </button>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-[#00ff88]/30 rounded-2xl p-8 mb-8 text-center">
            <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-[#00ff88]" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">{t('mood.thankYou')}</h3>
            <p className="text-gray-400">{t('mood.alreadySubmitted')}</p>
            {submittedAt && (
              <p className="text-[#475569] text-xs mt-2">
                {t('mood.submittedAt') || 'Submitted at'} {submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">{t('mood.stats24h')}</h2>

          {stats.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('mood.noData')}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Donut chart */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 text-center">{t('mood.distribution')}</h3>
                <div className="flex justify-center">
                  <SvgDonut
                    size={200}
                    thickness={40}
                    slices={stats.map((s: MoodStats) => ({
                      label: t(getMoodInfo(s.mood_type)?.labelKey ?? s.mood_type),
                      value: s.count,
                      color: s.mood_type === 'great' ? '#22c55e' : s.mood_type === 'good' ? '#10b981' : s.mood_type === 'okay' ? '#eab308' : s.mood_type === 'bad' ? '#f97316' : '#ef4444',
                    }))}
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                  {stats.map((stat: MoodStats) => {
                    const moodInfo = getMoodInfo(stat.mood_type);
                    if (!moodInfo) return null;
                    return (
                      <div key={stat.mood_type} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${moodInfo.selectedBg} opacity-80`} />
                        <span className="text-gray-300 text-sm">{t(moodInfo.labelKey)} ({stat.percentage.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 text-center">{t('mood.byHour')}</h3>
                <SvgStackedBars
                  data={hourlyData as unknown as DataRow[]}
                  xKey="hour"
                  height={280}
                  series={[
                    { key: 'great',    color: '#22c55e', label: t('mood.great') },
                    { key: 'good',     color: '#10b981', label: t('mood.good') },
                    { key: 'okay',     color: '#eab308', label: t('mood.okay') },
                    { key: 'bad',      color: '#f97316', label: t('mood.bad') },
                    { key: 'terrible', color: '#ef4444', label: t('mood.terrible') },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-4">{t('mood.about')}</h3>
          <div className="text-gray-400 space-y-3">
            <p>{t('mood.aboutText1')}</p>
            <p>{t('mood.aboutText2')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mood;
