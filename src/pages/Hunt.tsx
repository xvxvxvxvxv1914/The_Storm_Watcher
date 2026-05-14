import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trophy, MapPin, Star, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { useKpLive } from '../hooks/useKpLive';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface Sighting {
  id: string;
  user_id: string;
  display_name: string | null;
  location_name: string | null;
  kp_at_sighting: number | null;
  intensity: number | null;
  notes: string | null;
  created_at: string;
}

interface LeaderEntry {
  user_id: string;
  display_name: string | null;
  sightings_count: number;
}

const BADGES = [
  { id: 'first_light', emoji: '🌟', name: 'First Light', desc: 'Report your first aurora', req: (s: Sighting[]) => s.length >= 1 },
  { id: 'storm_chaser', emoji: '⚡', name: 'Storm Chaser', desc: 'Spot aurora during Kp ≥ 5', req: (s: Sighting[]) => s.some(r => (r.kp_at_sighting ?? 0) >= 5) },
  { id: 'night_owl', emoji: '🦉', name: 'Night Owl', desc: 'Report 5 sightings', req: (s: Sighting[]) => s.length >= 5 },
  { id: 'g3_witness', emoji: '💫', name: 'G3 Witness', desc: 'Spot aurora during Kp ≥ 7', req: (s: Sighting[]) => s.some(r => (r.kp_at_sighting ?? 0) >= 7) },
  { id: 'dedicated', emoji: '🎯', name: 'Dedicated Hunter', desc: 'Report 10 sightings', req: (s: Sighting[]) => s.length >= 10 },
  { id: 'veteran', emoji: '🏆', name: 'Aurora Veteran', desc: 'Report 20 sightings', req: (s: Sighting[]) => s.length >= 20 },
];

function calcPoints(sightings: Sighting[]): number {
  return sightings.reduce((sum, s) => sum + 10 + Math.round((s.kp_at_sighting ?? 0) * 2), 0);
}

const COOLDOWN_KEY = 'tsw_hunt_last_sighting';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

function getCooldownRemaining(): number {
  const last = parseInt(localStorage.getItem(COOLDOWN_KEY) ?? '0', 10);
  return Math.max(0, last + COOLDOWN_MS - Date.now());
}

function fmtCooldown(ms: number): string {
  const m = Math.ceil(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.ceil(m / 60)}h`;
}

export default function Hunt() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const kp = useKpLive();

  const [mySightings, setMySightings] = useState<Sighting[]>([]);
  const [recentSightings, setRecentSightings] = useState<Sighting[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState(settings.preferredLocationName || '');
  const [cooldownMs, setCooldownMs] = useState(getCooldownRemaining);
  const [showMySightings, setShowMySightings] = useState(false);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timer = setInterval(() => {
      const rem = getCooldownRemaining();
      setCooldownMs(rem);
      if (rem <= 0) clearInterval(timer);
    }, 30000);
    return () => clearInterval(timer);
  }, [cooldownMs]);

  const loadData = async () => {
    const [recentRes, leaderRes, myRes] = await Promise.all([
      supabase.from('aurora_sightings').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('hunter_leaderboard').select('*').limit(10),
      user ? supabase.from('aurora_sightings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    setRecentSightings((recentRes.data ?? []) as Sighting[]);
    setLeaderboard((leaderRes.data ?? []) as LeaderEntry[]);
    setMySightings((myRes.data ?? []) as Sighting[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const earnedBadges = BADGES.filter(b => b.req(mySightings)).map(b => b.id);

  const handleSubmit = async () => {
    if (!user) return;
    if (cooldownMs > 0) return;
    if (!locationName.trim()) {
      setSubmitError(t('hunt.locationRequired') || 'Please enter your location');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const { error } = await supabase.from('aurora_sightings').insert({
        user_id: user.id,
        display_name: profile?.full_name ?? null,
        location_name: locationName.trim(),
        latitude: settings.preferredLat ?? null,
        longitude: settings.preferredLon ?? null,
        kp_at_sighting: kp,
        intensity,
        notes: notes.trim() || null,
      });
      if (error) throw error;

      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setCooldownMs(COOLDOWN_MS);

      const oldBadgeIds = earnedBadges;
      const newSightings = [{ id: '', user_id: user.id, display_name: null, location_name: locationName, kp_at_sighting: kp, intensity, notes: notes || null, created_at: new Date().toISOString() }, ...mySightings];
      const newlyEarned = BADGES.filter(b => !oldBadgeIds.includes(b.id) && b.req(newSightings)).map(b => `${b.emoji} ${b.name}`);
      if (newlyEarned.length) setNewBadges(newlyEarned);

      setSubmitMsg(t('hunt.reportSuccess') || 'Sighting reported!');
      setTimeout(() => { setSubmitMsg(''); setNewBadges([]); }, 6000);
      setShowForm(false);
      setNotes('');
      setIntensity(3);
      await loadData();
    } catch {
      setSubmitError(t('hunt.reportError') || 'Failed to report sighting');
    } finally {
      setSubmitting(false);
    }
  };

  const myRank = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

  return (
    <div className="min-h-screen px-4 py-20 max-w-4xl mx-auto">
      <Helmet>
        <title>Aurora Hunt — The Storm Watcher</title>
        <meta name="description" content="Report aurora sightings, earn badges and compete on the leaderboard with other aurora hunters." />
        <link rel="canonical" href="https://thestormwatcher.com/hunt" />
      </Helmet>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-2xl flex items-center justify-center flex-shrink-0">
          <Trophy className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{t('hunt.title') || 'Aurora Hunt'}</h1>
          <p className="text-[#94a3b8] mt-0.5">{t('hunt.subtitle') || 'Report sightings, earn badges, lead the hunt'}</p>
        </div>
      </div>

      {/* Success / badge toast */}
      {(submitMsg || newBadges.length > 0) && (
        <div className="mb-6 glass-surface rounded-2xl px-5 py-4 border border-[#10b981]/30 space-y-1">
          {submitMsg && <p className="text-[#10b981] font-semibold">{submitMsg}</p>}
          {newBadges.map(b => (
            <p key={b} className="text-[#fbbf24] text-sm">🎉 {t('hunt.newBadge') || 'New badge:'} {b}</p>
          ))}
        </div>
      )}

      {/* Report button */}
      <div className="glass-surface rounded-2xl p-6 border border-white/10 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white font-semibold mb-0.5">{t('hunt.report') || 'Report a Sighting'}</p>
            <p className="text-[#94a3b8] text-sm">
              {kp !== null ? `${t('hunt.currentKp') || 'Current Kp:'} ${kp.toFixed(1)}` : t('app.loading') || 'Loading…'}
            </p>
          </div>
          {!user ? (
            <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-semibold text-sm hover:opacity-90 transition-opacity">
              <Target className="w-4 h-4" />
              {t('hunt.signInToReport') || 'Sign in to report'}
            </Link>
          ) : cooldownMs > 0 ? (
            <div className="text-center">
              <span className="text-[#64748b] text-sm px-4 py-2 rounded-xl border border-white/10 inline-block">
                {t('hunt.cooldown') || 'Next report in'} {fmtCooldown(cooldownMs)}
              </span>
              <p className="text-[#334155] text-xs mt-1.5">{t('hunt.cooldownHint') || 'One report per hour to keep the data accurate.'}</p>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(f => !f)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Target className="w-4 h-4" />
              {t('hunt.report') || 'Report Sighting'}
            </button>
          )}
        </div>

        {showForm && user && cooldownMs === 0 && (
          <div className="mt-6 border-t border-white/10 pt-5 space-y-4">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                {t('hunt.location') || 'Location'} *
              </label>
              <input
                type="text"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                maxLength={100}
                placeholder="Tromsø, Norway"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-1 focus:ring-[#f59e0b]/30 transition-colors text-sm"
              />
            </div>

            {/* Intensity */}
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                {t('hunt.intensity') || 'Aurora intensity'}: {intensity}/5
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    onClick={() => setIntensity(i)}
                    className={`w-10 h-10 rounded-xl text-lg transition-all ${i <= intensity ? 'bg-[#f59e0b]/20 border border-[#f59e0b]' : 'bg-white/5 border border-white/10 opacity-50'}`}
                  >
                    <Star className={`w-5 h-5 mx-auto ${i <= intensity ? 'text-[#fbbf24]' : 'text-[#475569]'}`} fill={i <= intensity ? '#fbbf24' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                {t('hunt.notes') || 'Notes (optional)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={200}
                placeholder="Visible to the naked eye, green curtains…"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-1 focus:ring-[#f59e0b]/30 transition-colors text-sm"
              />
            </div>

            {submitError && <p className="text-[#ef4444] text-sm">{submitError}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? (t('app.loading') || 'Submitting…') : (t('hunt.submit') || 'Submit Sighting')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl border border-white/10 text-[#94a3b8] text-sm hover:text-white hover:bg-white/5 transition-colors"
              >
                {t('profile.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* My stats + badges */}
      {user && !loading && mySightings.length > 0 && (
        <div className="glass-surface rounded-2xl p-6 border border-[#f59e0b]/20 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-white">{t('hunt.myStats') || 'My Stats'}</h2>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#fbbf24]">{mySightings.length}</p>
                <p className="text-[#64748b] text-xs">{t('hunt.sightings') || 'Sightings'}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#fbbf24]">{calcPoints(mySightings)}</p>
                <p className="text-[#64748b] text-xs">{t('hunt.points') || 'Points'}</p>
              </div>
              {myRank > 0 && (
                <div>
                  <p className="text-2xl font-bold text-[#fbbf24]">#{myRank}</p>
                  <p className="text-[#64748b] text-xs">{t('hunt.rank') || 'Rank'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex gap-3 flex-wrap">
            {BADGES.map(badge => {
              const earned = badge.req(mySightings);
              return (
                <div
                  key={badge.id}
                  title={badge.desc}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-center transition-all ${earned ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10' : 'border-white/5 bg-white/3 opacity-40'}`}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-[10px] font-semibold text-white leading-tight max-w-[64px]">{badge.name}</span>
                </div>
              );
            })}
          </div>

          {/* My sightings toggle */}
          <button
            onClick={() => setShowMySightings(v => !v)}
            className="mt-4 flex items-center gap-1 text-[#64748b] text-xs hover:text-white transition-colors"
          >
            {showMySightings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t('hunt.mySightings') || 'My sightings'} ({mySightings.length})
          </button>
          {showMySightings && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
              {mySightings.map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs text-[#94a3b8] py-1.5 border-b border-white/5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {s.location_name ?? '—'}
                  </span>
                  <span className="flex items-center gap-3">
                    {s.kp_at_sighting !== null && <span className="text-[#f97316] font-bold">Kp {s.kp_at_sighting.toFixed(1)}</span>}
                    <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="glass-surface rounded-2xl p-6 border border-white/10 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#fbbf24]" />
          {t('hunt.leaderboard') || 'Leaderboard'}
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 rounded-lg skeleton" />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[#94a3b8] text-sm font-semibold mb-1">{t('hunt.noSightings') || 'No sightings yet'}</p>
            <p className="text-[#475569] text-xs">Report the first aurora sighting and claim the top spot!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${entry.user_id === user?.id ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/20' : 'bg-white/3'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center ${idx === 0 ? 'text-[#fbbf24]' : idx === 1 ? 'text-[#94a3b8]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#475569]'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <span className="text-white text-sm">{entry.display_name ?? (t('hunt.anonymous') || 'Anonymous')}</span>
                </div>
                <span className="text-[#fbbf24] text-sm font-bold">{entry.sightings_count} {t('hunt.sightings') || 'sightings'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent community sightings */}
      <div className="glass-surface rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">{t('hunt.recentSightings') || 'Recent Sightings'}</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl skeleton" />)}
          </div>
        ) : recentSightings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[#94a3b8] text-sm font-semibold mb-1">No community sightings yet</p>
            <p className="text-[#475569] text-xs">Use the form above to log your first aurora sighting.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSightings.map(s => (
              <div key={s.id} className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{s.display_name ?? (t('hunt.anonymous') || 'Anonymous')}</span>
                    {s.location_name && (
                      <span className="inline-flex items-center gap-1 text-[#64748b] text-xs">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {s.location_name}
                      </span>
                    )}
                  </div>
                  {s.notes && <p className="text-[#94a3b8] text-xs mt-0.5 truncate">{s.notes}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  {s.intensity && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className="w-3 h-3" style={{ color: i <= s.intensity! ? '#fbbf24' : '#334155' }} fill={i <= s.intensity! ? '#fbbf24' : 'none'} />
                      ))}
                    </div>
                  )}
                  {s.kp_at_sighting !== null && (
                    <span className="text-[#f97316] text-xs font-bold">Kp {s.kp_at_sighting.toFixed(1)}</span>
                  )}
                  <span className="text-[#475569] text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
