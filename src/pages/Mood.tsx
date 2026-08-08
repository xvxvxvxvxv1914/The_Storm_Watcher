import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import StarField from '../components/StarField';
import { logError } from '../utils/logger';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import {
  CheckCircle, AlertCircle, BookOpen, Flame, Sparkles, Download,
  Brain, RefreshCcw, Waves, Moon, BatteryLow, Crosshair, HeartPulse,
} from 'lucide-react';
import SvgDonut from '../components/charts/SvgDonut';
import { supabase, getSessionId } from '../lib/supabase';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { getKpIndex, resolveKp } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface MoodStats {
  mood_type: string;
  count: number;
  percentage: number;
}

interface PersonalEntry {
  created_at: string;
  mood_type: string;
  kp_index?: number;
}

const MoodIconGreat = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <circle cx="32" cy="32" r="10" fill={active ? '#22c55e' : '#22c55e99'} />
    {[0,45,90,135,180,225,270,315].map((deg, i) => (
      <line key={i}
        x1={32 + 13 * Math.cos(deg * Math.PI / 180)}
        y1={32 + 13 * Math.sin(deg * Math.PI / 180)}
        x2={32 + 20 * Math.cos(deg * Math.PI / 180)}
        y2={32 + 20 * Math.sin(deg * Math.PI / 180)}
        stroke={active ? '#4ade80' : '#22c55e88'} strokeWidth="2.5" strokeLinecap="round"
      />
    ))}
  </svg>
);

const MoodIconGood = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
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
  </svg>
);

const MoodIconOkay = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <circle cx="32" cy="32" r="10" fill={active ? '#eab308' : '#eab30899'} />
    <circle cx="32" cy="32" r="16" stroke={active ? '#eab308' : '#eab30855'} strokeWidth="1.5" />
    <path d="M 20 32 Q 26 26 32 32 Q 38 38 44 32" stroke={active ? '#fde047' : '#eab30888'} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MoodIconBad = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <circle cx="32" cy="32" r="10" fill={active ? '#f97316' : '#f9731699'} />
    <path d="M 14 22 Q 20 28 26 22 Q 32 16 38 22 Q 44 28 50 22" stroke={active ? '#fb923c' : '#f9731666'} strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M 14 42 Q 20 36 26 42 Q 32 48 38 42 Q 44 36 50 42" stroke={active ? '#fb923c' : '#f9731666'} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MoodIconTerrible = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <circle cx="32" cy="32" r="9" fill={active ? '#ef4444' : '#ef444499'} />
    <line x1="24" y1="24" x2="40" y2="40" stroke={active ? '#fca5a5' : '#ef444466'} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="24" x2="24" y2="40" stroke={active ? '#fca5a5' : '#ef444466'} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MOODS = [
  { type: 'great',    labelKey: 'mood.great',    Icon: MoodIconGreat,    color: '#22c55e' },
  { type: 'good',     labelKey: 'mood.good',     Icon: MoodIconGood,     color: '#10b981' },
  { type: 'okay',     labelKey: 'mood.okay',     Icon: MoodIconOkay,     color: '#eab308' },
  { type: 'bad',      labelKey: 'mood.bad',      Icon: MoodIconBad,      color: '#f97316' },
  { type: 'terrible', labelKey: 'mood.terrible', Icon: MoodIconTerrible, color: '#ef4444' },
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

const DID_YOU_KNOW_KEYS = [
  'mood.didYouKnowText',
  'mood.fact.headaches',
  'mood.fact.sleep',
  'mood.fact.heartRate',
  'mood.fact.intuition',
];

// Mirrors the KpGauge bands (see src/components/KpGauge.tsx).
const getKpColor = (kp: number): string => {
  if (kp >= 7) return '#ef4444';
  if (kp >= 5) return '#f97316';
  if (kp >= 4) return '#eab308';
  return '#10b981';
};

const getKpLabel = (kp: number, t: (k: string) => string) => {
  if (kp >= 7) return { label: t('mood.kp.severe') || 'Severe Storm', color: '#ef4444' };
  if (kp >= 5) return { label: t('mood.kp.storm') || 'Geomagnetic Storm', color: '#f97316' };
  if (kp >= 4) return { label: t('mood.kp.unsettled') || 'Unsettled', color: '#eab308' };
  return { label: t('mood.kp.quiet') || 'Quiet', color: '#10b981' };
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'mood.greeting.morning';
  if (h < 18) return 'mood.greeting.afternoon';
  return 'mood.greeting.evening';
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Cosmic Orb — animated radial gradient with pulsing rings
const CosmicOrb = ({ kp, size = 200 }: { kp: number; size?: number }) => {
  const color = getKpColor(kp);
  const intensity = Math.min(kp / 9, 1);
  const reducedMotion = useReducedMotion();
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer pulsing rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `1px solid ${color}`,
            opacity: 0.3 - i * 0.1,
            willChange: reducedMotion ? 'auto' : 'transform, opacity',
          }}
          animate={reducedMotion ? undefined : {
            scale: [1, 1.4 + i * 0.15, 1],
            opacity: [0.3 - i * 0.1, 0, 0.3 - i * 0.1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 1.2,
            ease: 'easeOut',
          }}
        />
      ))}
      {/* Core orb */}
      <motion.div
        className="absolute inset-[20%] rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}ee 0%, ${color}88 40%, ${color}22 70%, transparent 100%)`,
          filter: 'blur(0.5px)',
          willChange: reducedMotion ? 'auto' : 'transform',
        }}
        animate={reducedMotion ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner bright dot */}
      <div
        className="absolute rounded-full"
        style={{
          left: '42%', top: '42%', width: '16%', height: '16%',
          background: `radial-gradient(circle, #fff 0%, ${color} 70%, transparent 100%)`,
          opacity: 0.6 + intensity * 0.4,
        }}
      />
      {/* Kp value centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Kp</div>
        <div className="text-4xl font-black text-white drop-shadow-lg" style={{ textShadow: `0 0 20px ${color}` }}>
          {kp.toFixed(1)}
        </div>
      </div>
    </div>
  );
};

// 7-day personal mood mini-chart with dots
const PersonalStreakChart = ({ entries }: { entries: PersonalEntry[] }) => {
  const days = useMemo(() => {
    const arr: { date: Date; score: number | null; mood: string | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const entry = entries.find(e => dayKey(new Date(e.created_at)) === dayKey(d));
      arr.push({
        date: d,
        score: entry ? (MOOD_SCORE[entry.mood_type] ?? null) : null,
        mood: entry?.mood_type ?? null,
      });
    }
    return arr;
  }, [entries]);

  const W = 280;
  const H = 60;
  const padX = 14;
  const padY = 10;
  const stepX = (W - padX * 2) / 6;

  const points = days.map((d, i) => {
    const x = padX + i * stepX;
    const y = d.score == null ? H / 2 : H - padY - ((d.score - 1) / 4) * (H - padY * 2);
    return { x, y, day: d };
  });

  const linePath = points
    .filter(p => p.day.score != null)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full max-w-xs">
      {linePath && (
        <motion.path
          d={linePath}
          stroke="url(#streakGrad)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}
      <defs>
        <linearGradient id="streakGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {points.map((p, i) => {
        const moodInfo = p.day.mood ? MOODS.find(m => m.type === p.day.mood) : null;
        const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const today = i === 6;
        return (
          <g key={i}>
            {p.day.score != null ? (
              <motion.circle
                cx={p.x} cy={p.y} r={today ? 5 : 3.5}
                fill={moodInfo?.color ?? '#888'}
                stroke={today ? '#fff' : 'none'}
                strokeWidth={today ? 1.5 : 0}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300 }}
              />
            ) : (
              <circle cx={p.x} cy={H / 2} r="2" fill="currentColor" opacity="0.2" />
            )}
            <text x={p.x} y={H + 14} textAnchor="middle" fontSize="9" fill="currentColor" opacity={today ? 1 : 0.4} fontWeight={today ? 700 : 500}>
              {labels[(p.day.date.getDay() + 6) % 7]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-5">
    <div className="h-56 glass-surface rounded-3xl" />
    <div className="h-32 glass-surface rounded-2xl" />
    <div className="h-64 glass-surface rounded-2xl" />
  </div>
);

const Mood = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  // null = Kp not resolved yet. The gauge falls back to 0 for display, but the
  // submitted entry keeps the null — a fabricated 0 would be filed as a genuine
  // ultra-quiet reading in the mood/Kp correlation.
  const [currentKp, setCurrentKp] = useState<number | null>(null);
  const [stats, setStats] = useState<MoodStats[]>([]);
  const [personalEntries, setPersonalEntries] = useState<PersonalEntry[]>([]);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [submittedMood, setSubmittedMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    fetchKp();
    fetchStats();
    checkPersonalHistory();
  }, []);

  const { pulling, pullY } = usePullToRefresh(async () => {
    await Promise.allSettled([fetchKp(), fetchStats(), checkPersonalHistory()]);
  });

  // Rotate facts every 8s
  useEffect(() => {
    const id = setInterval(() => {
      setFactIndex(i => (i + 1) % DID_YOU_KNOW_KEYS.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const fetchKp = async () => {
    try {
      const data = await getKpIndex();
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
        setCurrentKp(resolveKp(latest));
      }
    } catch (error) {
      logError('Error fetching Kp:', error);
    }
  };

  const checkPersonalHistory = async () => {
    try {
      const sessionId = getSessionId();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('mood_entries')
        .select('created_at, mood_type, kp_index')
        .eq('user_session_id', sessionId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      const entries = (data ?? []) as PersonalEntry[];
      setPersonalEntries(entries);

      const todayKey = dayKey(new Date());
      const todayEntry = entries.find(e => dayKey(new Date(e.created_at)) === todayKey);
      if (todayEntry) {
        setHasSubmittedToday(true);
        setSubmittedAt(new Date(todayEntry.created_at));
        setSubmittedMood(todayEntry.mood_type);
      }
    } catch {
      // Non-critical — page still works without history
    } finally {
      setLoading(false);
    }
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
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
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
    setSubmittedAt(new Date());
    setHasSubmittedToday(true);
    setSelectedMood(null);
    setSelectedSymptoms([]);
    fetchStats();
    checkPersonalHistory();
    setSubmitMessage({ type: 'success', text: t('mood.thankYou') });
  };

  const toggleSymptom = (key: string) => {
    setSelectedSymptoms(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const getMoodInfo = (moodType: string) => MOODS.find(m => m.type === moodType);

  const exportPersonalCSV = () => {
    const rows = [
      ['date', 'mood', 'mood_score', 'kp_index'],
      ...personalEntries
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(e => [
          new Date(e.created_at).toISOString(),
          e.mood_type,
          String(MOOD_SCORE[e.mood_type] ?? ''),
          e.kp_index != null ? String(e.kp_index) : '',
        ]),
    ];
    const csv = rows.map(r => r.map(cell => /[,"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mood-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getBetterThanPercent = (moodType: string): number => {
    const myScore = MOOD_SCORE[moodType] ?? 3;
    const total = stats.reduce((acc, s) => acc + s.count, 0);
    if (total === 0) return 0;
    const worseThan = stats.filter(s => (MOOD_SCORE[s.mood_type] ?? 3) < myScore).reduce((acc, s) => acc + s.count, 0);
    return Math.round((worseThan / total) * 100);
  };

  // Calculate streak (consecutive days with entries, including today/yesterday)
  const streak = useMemo(() => {
    if (personalEntries.length === 0) return 0;
    const sorted = [...personalEntries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    let count = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const key = dayKey(check);
      const hit = sorted.find(e => dayKey(new Date(e.created_at)) === key);
      if (hit) {
        count++;
        check.setDate(check.getDate() - 1);
      } else if (i === 0) {
        // No entry today — start checking from yesterday
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [personalEntries]);

  const displayKp = currentKp ?? 0;
  const kpStatus = getKpLabel(displayKp, t);
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-white/50' : 'text-slate-500';
  const textSub = isDark ? 'text-white/70' : 'text-slate-600';
  const surfaceBorder = isDark ? 'border-white/8' : 'border-black/8';

  if (loading) return (
    <div className="min-h-screen pt-20 pb-32 md:pt-24">
      <PageMeta title="Cosmic Mood Pulse — The Storm Watcher" description="Track how geomagnetic storms affect your mood and wellbeing." path="/mood" />
      <div className="max-w-xl mx-auto px-4 sm:px-6"><LoadingSkeleton /></div>
    </div>
  );

  const kpColor = getKpColor(displayKp);

  return (
    <div className="min-h-screen pt-20 pb-32 md:pt-24 md:pb-20 relative overflow-hidden">
      {pulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center w-9 h-9 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 transition-transform"
          style={{ transform: `translateX(-50%) translateY(${pullY}px)` }}
        >
          <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <PageMeta
        title="Cosmic Mood Pulse — The Storm Watcher"
        description="Track how geomagnetic storms affect your mood and wellbeing. See community mood patterns correlated with Kp index."
        path="/mood"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Mood', path: '/mood' }]} />
      <StarField />

      {/* Background ambient gradient */}
      <div className="absolute inset-0 pointer-events-none -z-10"
        style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${kpColor}1a 0%, transparent 60%)` }}
      />

      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-5">

        {/* HERO with cosmic orb */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center pt-4 pb-2"
        >
          <p className={`text-xs uppercase tracking-widest font-semibold mb-2 ${textMuted}`}>{t(getTimeGreeting())}</p>
          <div className="flex justify-center mb-3">
            <CosmicOrb kp={displayKp} size={180} />
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${textPrimary}`}>{t('mood.heroTitle')}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: kpStatus.color }}>{kpStatus.label}</span>
            <span className={`text-xs ${textMuted}`}>·</span>
            <span className={`text-xs ${textMuted}`}>{t('mood.heroSubtitle')}</span>
          </div>
        </motion.div>

        {/* PERSONAL STREAK — only if user has any history */}
        {personalEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className={`glass-surface rounded-2xl p-5 border ${surfaceBorder}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className={`text-base font-bold ${textPrimary}`}>
                    {streak} {streak === 1 ? t('mood.day') || 'day' : t('mood.days') || 'days'}
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t('mood.streakLabel') || 'Current streak'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t('mood.last7Days') || 'Last 7 days'}</span>
                {personalEntries.length >= 2 && (
                  <button
                    onClick={exportPersonalCSV}
                    aria-label={t('mood.exportCSV') || 'Export mood history as CSV'}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md ${isDark ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-black/4 text-slate-600 hover:bg-black/8'}`}
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                )}
              </div>
            </div>
            <div className={isDark ? 'text-white/70' : 'text-slate-700'}>
              <PersonalStreakChart entries={personalEntries} />
            </div>
          </motion.div>
        )}

        {/* Submit feedback message */}
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

        {/* SUBMIT FORM or SUBMITTED state */}
        <AnimatePresence mode="wait">
          {!hasSubmittedToday ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className={`glass-surface rounded-3xl p-5 sm:p-6 border ${surfaceBorder}`}
            >
              <h2 className={`text-base font-bold mb-1 ${textPrimary}`}>{t('mood.rateTitle')}</h2>
              {/* The symptoms question belongs to the symptom chips below, which
                  only appear once a mood is picked. Sitting here it asked about
                  symptoms that were nowhere on screen. mood.subtitle already
                  existed in all 16 locales, unused. */}
              <p className={`text-xs mb-5 ${textMuted}`}>{t('mood.subtitle')}</p>

              {/* Mood picker — bigger, 2 rows on mobile (3+2) for visual balance */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {MOODS.map((mood) => {
                  const isSelected = selectedMood === mood.type;
                  return (
                    <motion.button
                      key={mood.type}
                      onClick={() => setSelectedMood(mood.type)}
                      whileTap={{ scale: 0.92 }}
                      animate={isSelected ? { scale: 1.05, y: -2 } : { scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                      className={`relative flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-2xl border transition-colors duration-200 ${
                        isSelected
                          ? `${isDark ? 'bg-white/8' : 'bg-white/70'}`
                          : `${isDark ? 'bg-white/3 border-white/8' : 'bg-black/3 border-black/8'} hover:${isDark ? 'bg-white/5' : 'bg-black/5'}`
                      }`}
                      style={isSelected ? {
                        borderColor: mood.color,
                        boxShadow: `0 0 0 1px ${mood.color}80, 0 8px 24px -8px ${mood.color}66`,
                      } : undefined}
                    >
                      <mood.Icon active={isSelected} />
                      <span className={`text-[10px] font-semibold leading-tight text-center ${isSelected ? textPrimary : textMuted}`}>
                        {t(mood.labelKey)}
                      </span>
                      {isSelected && (
                        <motion.div
                          layoutId="moodDot"
                          className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                          style={{ background: mood.color }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Symptoms — only show when mood selected */}
              <AnimatePresence>
                {selectedMood && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-1">
                      <p className={`text-xs ${textMuted}`}>{t('mood.symptomsQuestion')}</p>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${textMuted}`}>{t('mood.physical')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PHYSICAL_SYMPTOMS.map(({ key, Icon }) => {
                            const isActive = selectedSymptoms.includes(key);
                            return (
                              <motion.button
                                key={key}
                                onClick={() => toggleSymptom(key)}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  isActive
                                    ? 'bg-violet-500/15 border-violet-400/40 text-violet-300'
                                    : `${isDark ? 'bg-white/4 border-white/8 text-white/60' : 'bg-black/4 border-black/8 text-slate-500'}`
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                {t(key)}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${textMuted}`}>{t('mood.mental')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {MENTAL_SYMPTOMS.map(({ key, Icon }) => {
                            const isActive = selectedSymptoms.includes(key);
                            return (
                              <motion.button
                                key={key}
                                onClick={() => toggleSymptom(key)}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  isActive
                                    ? 'bg-violet-500/15 border-violet-400/40 text-violet-300'
                                    : `${isDark ? 'bg-white/4 border-white/8 text-white/60' : 'bg-black/4 border-black/8 text-slate-500'}`
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

              {/* Inline submit — for desktop. Mobile gets sticky CTA below */}
              <div className="hidden md:block mt-5">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedMood}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    selectedMood
                      ? 'text-white shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                      : `${isDark ? 'bg-white/8 text-white/30' : 'bg-black/6 text-black/30'} cursor-not-allowed`
                  }`}
                  style={selectedMood ? {
                    background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)',
                    boxShadow: '0 8px 32px -8px rgba(139,92,246,0.5)',
                  } : undefined}
                >
                  {t('mood.shareMyMood')} →
                </button>
                <p className={`text-center text-[10px] mt-2 ${textMuted}`}>{t('mood.anonymous')}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className={`glass-surface rounded-3xl p-6 text-center border ${surfaceBorder}`}
            >
              {submittedMood && (() => {
                const moodInfo = getMoodInfo(submittedMood);
                const betterThan = getBetterThanPercent(submittedMood);
                return (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: `radial-gradient(circle, ${moodInfo?.color}33 0%, ${moodInfo?.color}11 70%, transparent 100%)`,
                        border: `2px solid ${moodInfo?.color}66`,
                      }}
                    >
                      {moodInfo && <moodInfo.Icon active />}
                    </motion.div>
                    <div className={`text-xl font-bold mb-1 ${textPrimary}`}>{t('mood.thankYou')}</div>
                    <div className={`text-sm mb-5 ${textSub}`}>{t('mood.alreadySubmitted')}</div>

                    {betterThan > 0 && (
                      <div className="mb-4">
                        <div className={`text-3xl font-black mb-1`} style={{ color: moodInfo?.color }}>
                          {betterThan}%
                        </div>
                        <div className={`text-xs mb-3 ${textMuted}`}>{t('mood.betterThan')}</div>
                        <div className={`h-1 mx-auto max-w-[200px] rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${betterThan}%` }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, #8b5cf6, ${moodInfo?.color})` }}
                          />
                        </div>
                      </div>
                    )}

                    {submittedAt && (
                      <p className={`text-[10px] uppercase tracking-wider ${textMuted}`}>
                        {t('mood.submittedAt')} {submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* DID YOU KNOW? — rotating */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`glass-surface rounded-2xl p-5 border-l-2 border-violet-500/60 ${surfaceBorder}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-sm font-bold ${textPrimary}`}>{t('mood.didYouKnow')}</h3>
                <Sparkles className="w-3 h-3 text-violet-400/70" />
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={factIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  className={`text-xs leading-relaxed ${textSub}`}
                >
                  {t(DID_YOU_KNOW_KEYS[factIndex])}
                </motion.p>
              </AnimatePresence>
              <div className="flex gap-1 mt-3">
                {DID_YOU_KNOW_KEYS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFactIndex(i)}
                    aria-label={`Fact ${i + 1}`}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === factIndex ? 16 : 6,
                      background: i === factIndex ? '#a78bfa' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* COMMUNITY PULSE */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className={`glass-surface rounded-2xl p-5 sm:p-6 border ${surfaceBorder}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-base font-bold ${textPrimary}`}>{t('mood.communityToday')}</h2>
              <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>
                {stats.reduce((a, s) => a + s.count, 0)} {t('mood.votes') || 'votes'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                <SvgDonut
                  size={140}
                  thickness={26}
                  ariaLabel="Community mood distribution today"
                  slices={stats.map((s) => ({
                    label: t(getMoodInfo(s.mood_type)?.labelKey ?? s.mood_type),
                    value: s.count,
                    color: getMoodInfo(s.mood_type)?.color ?? '#888',
                  }))}
                />
              </div>
              <div className="flex-1 w-full space-y-2">
                {stats.map((stat) => {
                  const moodInfo = getMoodInfo(stat.mood_type);
                  if (!moodInfo) return null;
                  return (
                    <div key={stat.mood_type} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: moodInfo.color }} />
                      <span className={`text-xs flex-1 ${textSub}`}>{t(moodInfo.labelKey)}</span>
                      <div className={`h-1 flex-1 rounded-full overflow-hidden ${isDark ? 'bg-white/8' : 'bg-black/6'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ background: moodInfo.color }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-10 text-right ${textMuted}`}>{stat.percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* STICKY MOBILE CTA — only when mood selected & form visible */}
      <AnimatePresence>
        {!hasSubmittedToday && selectedMood && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="md:hidden fixed left-0 right-0 z-30 px-4 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
          >
            <div className="pointer-events-auto max-w-xl mx-auto">
              <div
                className="rounded-2xl p-3"
                style={{
                  background: isDark ? 'rgba(10,10,26,0.85)' : 'rgba(248,250,252,0.92)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.3)',
                }}
              >
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)',
                    boxShadow: '0 8px 24px -8px rgba(139,92,246,0.5)',
                  }}
                >
                  {t('mood.shareMyMood')} →
                </button>
                <p className={`text-center text-[10px] mt-1.5 ${textMuted}`}>{t('mood.anonymous')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Mood;
