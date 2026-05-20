import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logError } from '../utils/logger';
import PageMeta from '../components/PageMeta';
import {
  TrendingUp, CheckCircle, AlertCircle, BookOpen,
  Brain, RefreshCcw, Waves, Moon, BatteryLow, Flame, Crosshair, HeartPulse,
} from 'lucide-react';
import SvgDonut from '../components/charts/SvgDonut';
import SvgStackedBars, { type DataRow } from '../components/charts/SvgStackedBars';
import { supabase, getSessionId } from '../lib/supabase';
import { getKpIndex } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

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
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
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
    <defs>
      <radialGradient id="gGreat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#bbf7d0" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const MoodIconGood = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
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
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <circle cx="32" cy="32" r="10" fill={active ? '#eab308' : '#eab30899'} />
    <circle cx="32" cy="32" r="16" stroke={active ? '#eab308' : '#eab30855'} strokeWidth="1.5" />
    <circle cx="32" cy="32" r="22" stroke={active ? '#eab30850' : '#eab30825'} strokeWidth="1" />
    <path d="M 20 32 Q 26 26 32 32 Q 38 38 44 32" stroke={active ? '#fde047' : '#eab30888'} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MoodIconBad = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <circle cx="32" cy="32" r="10" fill={active ? '#f97316' : '#f9731699'} />
    <path d="M 14 22 Q 20 28 26 22 Q 32 16 38 22 Q 44 28 50 22" stroke={active ? '#fb923c' : '#f9731666'} strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M 14 42 Q 20 36 26 42 Q 32 48 38 42 Q 44 36 50 42" stroke={active ? '#fb923c' : '#f9731666'} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MoodIconTerrible = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <circle cx="32" cy="32" r="9" fill={active ? '#ef4444' : '#ef444499'} />
    {[0,1,2,3,4].map(i => {
      const r1 = 13 + i * 4.5;
      const dash = `${(2 + i) * 1.5} ${2 + i}`;
      return <circle key={i} cx="32" cy="32" r={r1} stroke={active ? `rgba(239,68,68,${0.7 - i * 0.12})` : `rgba(239,68,68,${0.3 - i * 0.05})`} strokeWidth="2" strokeDasharray={dash} />;
    })}
    <line x1="24" y1="24" x2="40" y2="40" stroke={active ? '#fca5a5' : '#ef444466'} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="24" x2="24" y2="40" stroke={active ? '#fca5a5' : '#ef444466'} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MOODS = [
  { type: 'great',    labelKey: 'mood.great',    Icon: MoodIconGreat,    color: '#22c55e', ring: 'ring-green-400',   glow: 'shadow-green-500/40',   bg: 'bg-green-500/10',   selectedBg: 'bg-green-500/20',   selectedRing: 'ring-green-400' },
  { type: 'good',     labelKey: 'mood.good',     Icon: MoodIconGood,     color: '#10b981', ring: 'ring-emerald-400', glow: 'shadow-emerald-500/40', bg: 'bg-emerald-500/10', selectedBg: 'bg-emerald-500/20', selectedRing: 'ring-emerald-400' },
  { type: 'okay',     labelKey: 'mood.okay',     Icon: MoodIconOkay,     color: '#eab308', ring: 'ring-yellow-400',  glow: 'shadow-yellow-500/40',  bg: 'bg-yellow-500/10',  selectedBg: 'bg-yellow-500/20',  selectedRing: 'ring-yellow-400' },
  { type: 'bad',      labelKey: 'mood.bad',      Icon: MoodIconBad,      color: '#f97316', ring: 'ring-orange-400',  glow: 'shadow-orange-500/40',  bg: 'bg-orange-500/10',  selectedBg: 'bg-orange-500/20',  selectedRing: 'ring-orange-400' },
  { type: 'terrible', labelKey: 'mood.terrible', Icon: MoodIconTerrible, color: '#ef4444', ring: 'ring-red-400',     glow: 'shadow-red-500/40',     bg: 'bg-red-500/10',     selectedBg: 'bg-red-500/20',     selectedRing: 'ring-red-400' },
];

const MOOD_SCORE: Record<string, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };

const PHYSICAL_SYMPTOMS = [
  { key: 'mood.symptom.headache',    Icon: Brain },
  { key: 'mood.symptom.dizzy',       Icon: RefreshCcw },
  { key: 'mood.symptom.insomnia',    Icon: Moon },
  { key: 'mood.symptom.fatigue',     Icon: BatteryLow },
  { key: 'mood.symptom.palpitations',Icon: HeartPulse },
];

const MENTAL_SYMPTOMS = [
  { key: 'mood.symptom.anxiety',      Icon: Waves },
  { key: 'mood.symptom.irritability', Icon: Flame },
  { key: 'mood.symptom.concentration',Icon: Crosshair },
];

const getKpGlow = (kp: number): string => {
  if (kp >= 7) return 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(239,68,68,0.28) 0%, transparent 65%)';
  if (kp >= 5) return 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(249,115,22,0.22) 0%, transparent 65%)';
  if (kp >= 3) return 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 65%)';
  return 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 65%)';
};

const getKpLabel = (kp: number) => {
  if (kp >= 7) return { label: 'Severe Storm', color: '#ef4444' };
  if (kp >= 5) return { label: 'Geomagnetic Storm', color: '#f97316' };
  if (kp >= 3) return { label: 'Unsettled', color: '#8b5cf6' };
  return { label: 'Quiet', color: '#10b981' };
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'mood.greeting.morning';
  if (h < 18) return 'mood.greeting.afternoon';
  return 'mood.greeting.evening';
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-32 glass-surface rounded-2xl" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-24 glass-surface rounded-2xl" />
      <div className="h-24 glass-surface rounded-2xl" />
    </div>
    <div className="h-64 glass-surface rounded-2xl" />
    <div className="h-48 glass-surface rounded-2xl" />
  </div>
);

const Mood = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [currentKp, setCurrentKp] = useState<number>(0);
  const [stats, setStats] = useState<MoodStats[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [, setTotalEntries] = useState(0);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [submittedMood, setSubmittedMood] = useState<string | null>(null);
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
      .select('id, created_at, mood_type')
      .eq('user_session_id', sessionId)
      .gte('created_at', today.toISOString())
      .maybeSingle();

    setHasSubmittedToday(!!data);
    if (data) {
      setSubmittedAt(new Date((data as { id: string; created_at: string; mood_type: string }).created_at));
      setSubmittedMood((data as { id: string; created_at: string; mood_type: string }).mood_type);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('mood_entries')
      .select('mood_type, created_at')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (error) { logError('Error fetching stats:', error); return; }

    if (data) {
      const total = data.length;
      setTotalEntries(total);
      const moodCounts: Record<string, number> = {};
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

      const hourlyMap: Record<string, HourlyData> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setHours(d.getHours() - i, 0, 0, 0);
        const key = d.getHours().toString().padStart(2, '0') + ':00';
        hourlyMap[key] = { hour: key, great: 0, good: 0, okay: 0, bad: 0, terrible: 0 };
      }
      data.forEach((entry: { mood_type: string; created_at: string }) => {
        const h = new Date(entry.created_at).getHours().toString().padStart(2, '0') + ':00';
        if (hourlyMap[h]) hourlyMap[h][entry.mood_type as keyof Omit<HourlyData, 'hour'>]++;
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
        body: JSON.stringify({ session_id: sessionId, mood_type: selectedMood, symptoms: selectedSymptoms, kp_index: currentKp }),
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
    setSubmittedMood(selectedMood);
    setHasSubmittedToday(true);
    setSelectedMood(null);
    setSelectedSymptoms([]);
    fetchStats();
    setSubmitMessage({ type: 'success', text: t('mood.thankYou') });
  };

  const toggleSymptom = (key: string) => {
    setSelectedSymptoms(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const getMoodInfo = (moodType: string) => MOODS.find(m => m.type === moodType);

  const getBetterThanPercent = (moodType: string): number => {
    const myScore = MOOD_SCORE[moodType] ?? 3;
    const total = stats.reduce((acc, s) => acc + s.count, 0);
    if (total === 0) return 0;
    const worseThan = stats.filter(s => (MOOD_SCORE[s.mood_type] ?? 3) < myScore).reduce((acc, s) => acc + s.count, 0);
    return Math.round((worseThan / total) * 100);
  };

  const kpStatus = getKpLabel(currentKp);
  const topMood = stats[0];

  if (loading) return (
    <div className="min-h-screen pt-20 pb-24 md:pt-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <LoadingSkeleton />
      </div>
    </div>
  );

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-white/50' : 'text-slate-500';
  const textSub = isDark ? 'text-white/70' : 'text-slate-600';

  return (
    <div
      className="min-h-screen pt-20 pb-24 md:pt-24"
      style={{ background: getKpGlow(currentKp) }}
    >
      <PageMeta
        title="Cosmic Mood Pulse — The Storm Watcher"
        description="Track how geomagnetic storms affect your mood and wellbeing. See community mood patterns correlated with Kp index."
        path="/mood"
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-2 pb-4"
        >
          <p className={`text-sm font-medium mb-1 ${textMuted}`}>{t(getTimeGreeting())}</p>
          <h1 className={`text-3xl sm:text-4xl font-bold mb-1 ${textPrimary}`}>
            {t('mood.heroTitle')}
          </h1>
          <p className={`text-sm ${textMuted}`}>{t('mood.heroSubtitle')}</p>
        </motion.div>

        {/* Kp + Forecast cards */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="glass-surface rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
              <span className={`text-xs font-medium ${textMuted}`}>{t('mood.currentKp')}</span>
            </div>
            <div className={`text-3xl font-bold mb-0.5 ${textPrimary}`}>{currentKp.toFixed(1)}</div>
            <div className="text-xs font-semibold" style={{ color: kpStatus.color }}>{kpStatus.label}</div>
          </div>
          <div className="glass-surface rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-violet-500/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
              </div>
              <span className={`text-xs font-medium ${textMuted}`}>{t('mood.cosmicForecast')}</span>
            </div>
            <div className={`text-sm font-bold leading-tight ${textPrimary}`}>
              {topMood ? t(getMoodInfo(topMood.mood_type)?.labelKey ?? '') : '—'}
            </div>
            <div className={`text-xs mt-0.5 ${textMuted}`}>
              {topMood ? `${topMood.percentage.toFixed(0)}% ${t('mood.communityToday').toLowerCase()}` : t('mood.noData')}
            </div>
          </div>
        </motion.div>

        {/* Submit message */}
        <AnimatePresence>
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                submitMessage.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {submitMessage.type === 'success'
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {submitMessage.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit form or submitted state */}
        <AnimatePresence mode="wait">
          {!hasSubmittedToday ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="glass-surface rounded-2xl p-5 sm:p-6"
            >
              <h2 className={`text-lg font-bold mb-5 ${textPrimary}`}>{t('mood.rateTitle')}</h2>

              {/* Mood grid */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {MOODS.map((mood) => {
                  const isSelected = selectedMood === mood.type;
                  const communityPct = stats.find(s => s.mood_type === mood.type)?.percentage ?? 0;
                  return (
                    <motion.button
                      key={mood.type}
                      onClick={() => setSelectedMood(mood.type)}
                      whileTap={{ scale: 0.93 }}
                      animate={isSelected ? { scale: 1.06 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all duration-150 ${
                        isSelected
                          ? `${mood.selectedBg} border-current ring-2 ${mood.selectedRing} shadow-lg ${mood.glow}`
                          : `${isDark ? 'bg-white/4 border-white/8' : 'bg-black/3 border-black/8'} hover:border-white/20`
                      }`}
                      style={isSelected ? { borderColor: mood.color } : undefined}
                    >
                      <mood.Icon active={isSelected} />
                      <span className={`text-[10px] font-semibold leading-tight text-center ${isSelected ? textPrimary : textMuted}`}>
                        {t(mood.labelKey)}
                      </span>
                      {communityPct > 0 && (
                        <span className="text-[9px] font-medium" style={{ color: mood.color, opacity: 0.8 }}>
                          {communityPct.toFixed(0)}%
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Symptoms */}
              <AnimatePresence>
                {selectedMood && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mb-6"
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>{t('mood.symptomsQuestion')}</p>
                    <div className="space-y-3">
                      {/* Physical */}
                      <div>
                        <p className={`text-xs font-medium mb-2 ${textMuted}`}>{t('mood.physical')}</p>
                        <div className="flex flex-wrap gap-2">
                          {PHYSICAL_SYMPTOMS.map(({ key, Icon }) => {
                            const isActive = selectedSymptoms.includes(key);
                            return (
                              <motion.button
                                key={key}
                                onClick={() => toggleSymptom(key)}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  isActive
                                    ? 'bg-violet-500/20 border-violet-400/50 text-violet-300'
                                    : `${isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-black/4 border-black/10 text-slate-500'} hover:border-white/25`
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                {t(key)}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Mental */}
                      <div>
                        <p className={`text-xs font-medium mb-2 ${textMuted}`}>{t('mood.mental')}</p>
                        <div className="flex flex-wrap gap-2">
                          {MENTAL_SYMPTOMS.map(({ key, Icon }) => {
                            const isActive = selectedSymptoms.includes(key);
                            return (
                              <motion.button
                                key={key}
                                onClick={() => toggleSymptom(key)}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  isActive
                                    ? 'bg-violet-500/20 border-violet-400/50 text-violet-300'
                                    : `${isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-black/4 border-black/10 text-slate-500'} hover:border-white/25`
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                {t(key)}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!selectedMood}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                  selectedMood
                    ? 'text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.01] active:scale-[0.99]'
                    : `${isDark ? 'bg-white/8 text-white/30' : 'bg-black/6 text-black/30'} cursor-not-allowed`
                }`}
                style={selectedMood ? { background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)' } : undefined}
              >
                {t('mood.shareMyMood')} →
              </button>
              <p className={`text-center text-[10px] mt-2 ${textMuted}`}>{t('mood.anonymous')}</p>
            </motion.div>
          ) : (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="glass-surface rounded-2xl p-6 text-center"
            >
              {submittedMood && (() => {
                const moodInfo = getMoodInfo(submittedMood);
                const betterThan = getBetterThanPercent(submittedMood);
                return (
                  <>
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: `${moodInfo?.color}22`, border: `2px solid ${moodInfo?.color}55` }}
                    >
                      {moodInfo && <moodInfo.Icon active />}
                    </div>
                    <div className={`text-xl font-bold mb-1 ${textPrimary}`}>{t('mood.thankYou')}</div>
                    <div className={`text-sm mb-4 ${textSub}`}>
                      {t('mood.alreadySubmitted')}
                    </div>

                    {betterThan > 0 && (
                      <div className={`${isDark ? 'bg-white/5' : 'bg-black/4'} rounded-xl p-3 mb-4`}>
                        <div className={`text-xs font-medium mb-2 ${textMuted}`}>
                          {betterThan}% {t('mood.betterThan')}
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${betterThan}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, #8b5cf6, ${moodInfo?.color})` }}
                          />
                        </div>
                      </div>
                    )}

                    {submittedAt && (
                      <p className={`text-xs ${textMuted}`}>
                        {t('mood.submittedAt')} {submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Community Today */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="glass-surface rounded-2xl p-5 sm:p-6"
          >
            <h2 className={`text-base font-bold mb-4 ${textPrimary}`}>{t('mood.communityToday')}</h2>

            {/* Hero stat */}
            {topMood && (
              <div className={`flex items-center gap-3 p-3 rounded-xl mb-5 ${isDark ? 'bg-white/5' : 'bg-black/4'}`}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${getMoodInfo(topMood.mood_type)?.color}22` }}
                >
                  {getMoodInfo(topMood.mood_type) && (() => {
                    const MoodIcon = getMoodInfo(topMood.mood_type)!.Icon;
                    return <MoodIcon active />;
                  })()}
                </div>
                <div>
                  <div className={`text-sm font-bold ${textPrimary}`}>
                    {t(getMoodInfo(topMood.mood_type)?.labelKey ?? '')}
                    <span className={`ml-2 font-normal text-xs ${textMuted}`}>{topMood.percentage.toFixed(0)}%</span>
                  </div>
                  <div className={`text-xs ${textMuted}`}>{t('mood.topMood')}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Donut */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${textSub}`}>{t('mood.distribution')}</h3>
                <div className="flex justify-center mb-3">
                  <SvgDonut
                    size={160}
                    thickness={32}
                    slices={stats.map((s: MoodStats) => ({
                      label: t(getMoodInfo(s.mood_type)?.labelKey ?? s.mood_type),
                      value: s.count,
                      color: getMoodInfo(s.mood_type)?.color ?? '#888',
                    }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {stats.map((stat: MoodStats) => {
                    const moodInfo = getMoodInfo(stat.mood_type);
                    if (!moodInfo) return null;
                    return (
                      <div key={stat.mood_type} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: moodInfo.color }} />
                        <span className={`text-xs ${textMuted}`}>{t(moodInfo.labelKey)} {stat.percentage.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stacked bars */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${textSub}`}>{t('mood.byHour')}</h3>
                <SvgStackedBars
                  data={hourlyData as unknown as DataRow[]}
                  xKey="hour"
                  height={200}
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
          </motion.div>
        )}

        {/* Did you know? */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-surface rounded-2xl p-5 border-l-4 border-violet-500/60"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className={`text-sm font-bold mb-1 ${textPrimary}`}>{t('mood.didYouKnow')}</h3>
              <p className={`text-xs leading-relaxed ${textSub}`}>{t('mood.didYouKnowText')}</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Mood;
