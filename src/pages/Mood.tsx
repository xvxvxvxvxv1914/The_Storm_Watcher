import { useEffect, useState } from 'react';
import { Smile, Frown, Meh, ThumbsUp, ThumbsDown, Users, TrendingUp } from 'lucide-react';
import { supabase, getSessionId } from '../lib/supabase';
import { getKpIndex } from '../services/noaaApi';

interface MoodEntry {
  id: string;
  mood_type: string;
  symptoms: string[];
  created_at: string;
  kp_index: number;
}

interface MoodStats {
  mood_type: string;
  count: number;
  percentage: number;
}

const Mood = () => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [currentKp, setCurrentKp] = useState<number>(0);
  const [stats, setStats] = useState<MoodStats[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const moods = [
    { type: 'great', label: 'Чудесно', icon: ThumbsUp, color: 'bg-green-500', textColor: 'text-green-500' },
    { type: 'good', label: 'Добре', icon: Smile, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    { type: 'okay', label: 'Нормално', icon: Meh, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { type: 'bad', label: 'Лошо', icon: Frown, color: 'bg-orange-500', textColor: 'text-orange-500' },
    { type: 'terrible', label: 'Ужасно', icon: ThumbsDown, color: 'bg-red-500', textColor: 'text-red-500' },
  ];

  const symptoms = [
    'Главоболие',
    'Замаяност',
    'Безпокойство',
    'Безсъние',
    'Умора',
    'Раздразнителност',
    'Липса на концентрация',
    'Сърцебиене',
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
      alert('Грешка при записване. Моля, опитайте отново.');
      return;
    }

    setHasSubmittedToday(true);
    setSelectedMood(null);
    setSelectedSymptoms([]);
    fetchStats();
    alert('Благодарим за вашата оценка!');
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const getMoodInfo = (moodType: string) => {
    return moods.find((m) => m.type === moodType);
  };

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
          <h1 className="text-4xl font-bold text-white mb-2">Как се чувствате днес?</h1>
          <p className="text-gray-400">Споделете как се чувствате по време на космически събития</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-[#00ff88]" />
              <h3 className="text-gray-400 text-sm">Участници (24ч)</h3>
            </div>
            <div className="text-4xl font-bold text-white">{totalEntries}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-[#3b82f6]" />
              <h3 className="text-gray-400 text-sm">Текущ Kp индекс</h3>
            </div>
            <div className="text-4xl font-bold text-white">{currentKp.toFixed(1)}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Smile className="w-5 h-5 text-[#8b5cf6]" />
              <h3 className="text-gray-400 text-sm">Най-честа оценка</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.length > 0 ? getMoodInfo(stats[0].mood_type)?.label : '-'}
            </div>
          </div>
        </div>

        {!hasSubmittedToday ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Оценете как се чувствате</h2>

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
                      {mood.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedMood && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Имате ли някои от тези симптоми? (по избор)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {symptoms.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          isSelected
                            ? 'bg-[#00ff88] text-[#0a0a1a] font-semibold'
                            : 'bg-white/5 text-gray-300 border border-white/10 hover:border-white/30'
                        }`}
                      >
                        {symptom}
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
              Изпрати оценка
            </button>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-[#00ff88]/30 rounded-2xl p-8 mb-8 text-center">
            <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-[#00ff88]" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">Благодарим!</h3>
            <p className="text-gray-400">Вече сте оценили как се чувствате днес. Можете да гласувате отново утре.</p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Статистика за последните 24 часа</h2>

          {stats.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Все още няма данни за последните 24 часа.</p>
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
                        <span className="text-white font-semibold">{moodInfo.label}</span>
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
          <h3 className="text-xl font-semibold text-white mb-4">За този раздел</h3>
          <div className="text-gray-400 space-y-3">
            <p>
              Космическото време може да влияе на самочувствието на хората. Тази страница ви позволява да споделите как се чувствате и да видите как се чувстват другите.
            </p>
            <p>
              Вашите данни са напълно анонимни и се използват само за статистически цели. Можете да гласувате веднъж на ден.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mood;
