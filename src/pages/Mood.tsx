import { useEffect, useState } from 'react';
import { Smile, Frown, Meh, ThumbsUp, ThumbsDown, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, getSessionId } from '../lib/supabase';
import { getKpIndex } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

interface MoodStats {
  mood_type: string;
  count: number;
  percentage: number;
}

const Mood = () => {
  const { t } = useLanguage();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [currentKp, setCurrentKp] = useState<number>(0);
  const [stats, setStats] = useState<MoodStats[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const moods = [
    { type: 'great', labelKey: 'mood.great', icon: ThumbsUp, color: 'bg-green-500', textColor: 'text-green-500' },
    { type: 'good', labelKey: 'mood.good', icon: Smile, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    { type: 'okay', labelKey: 'mood.okay', icon: Meh, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { type: 'bad', labelKey: 'mood.bad', icon: Frown, color: 'bg-orange-500', textColor: 'text-orange-500' },
    { type: 'terrible', labelKey: 'mood.terrible', icon: ThumbsDown, color: 'bg-red-500', textColor: 'text-red-500' },
  ];

  const symptomKeys = [
    'mood.symptom.headache',
    'mood.symptom.dizzy',
    'mood.symptom.anxiety',
    'mood.symptom.insomnia',
    'mood.symptom.fatigue',
    'mood.symptom.irritability',
    'mood.symptom.concentration',
    'mood.symptom.palpitations',
  ];

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
      console.error('Error fetching Kp:', error);
    }
  };

  const checkIfSubmittedToday = async () => {
    const sessionId = getSessionId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('mood_entries')
      .select('id')
      .eq('user_session_id', sessionId)
      .gte('created_at', today.toISOString())
      .maybeSingle();

    setHasSubmittedToday(!!data);
    setLoading(false);
  };

  const fetchStats = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('mood_entries')
      .select('mood_type')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (error) {
      console.error('Error fetching stats:', error);
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
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;

    const sessionId = getSessionId();

    const { error } = await supabase.from('mood_entries').insert({
      user_session_id: sessionId,
      mood_type: selectedMood,
      symptoms: selectedSymptoms,
      kp_index: currentKp,
    });

    if (error) {
      console.error('Error submitting mood:', error);
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

  const getMoodInfo = (moodType: string) => moods.find((m) => m.type === moodType);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24">
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
              <Smile className="w-5 h-5 text-[#8b5cf6]" />
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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              {moods.map((mood) => {
                const Icon = mood.icon;
                const isSelected = selectedMood === mood.type;
                return (
                  <button
                    key={mood.type}
                    onClick={() => setSelectedMood(mood.type)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `${mood.color} border-white`
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <Icon className={`w-12 h-12 mx-auto mb-3 ${isSelected ? 'text-white' : mood.textColor}`} />
                    <div className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {t(mood.labelKey)}
                    </div>
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
                  {symptomKeys.map((key) => {
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
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">{t('mood.stats24h')}</h2>

          {stats.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('mood.noData')}</p>
          ) : (
            <div className="space-y-4">
              {stats.map((stat) => {
                const moodInfo = getMoodInfo(stat.mood_type);
                if (!moodInfo) return null;
                const Icon = moodInfo.icon;

                return (
                  <div key={stat.mood_type} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-6 h-6 ${moodInfo.textColor}`} />
                        <span className="text-white font-semibold">{t(moodInfo.labelKey)}</span>
                      </div>
                      <div className="text-white font-semibold">
                        {stat.count} ({stat.percentage.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${moodInfo.color} transition-all duration-500`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
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
