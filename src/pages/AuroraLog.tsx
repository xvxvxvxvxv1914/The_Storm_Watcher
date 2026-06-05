import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, MapPin, Star, BookOpen } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import StarField from '../components/StarField';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../utils/logger';
import { Link } from 'react-router-dom';

interface Sighting {
  id: string;
  sighted_at: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  intensity: number;
  notes: string | null;
  kp_at_sighting: number | null;
  created_at: string;
}

const INTENSITY_LABELS = ['', 'Faint glow', 'Visible arcs', 'Clear bands', 'Vivid curtains', 'Full corona'];
const INTENSITY_COLORS = ['', '#4ade80', '#34d399', '#10b981', '#f97316', '#ef4444'];

function IntensityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Intensity ${n}: ${INTENSITY_LABELS[n]}`}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all"
          style={
            value === n
              ? { background: INTENSITY_COLORS[n] + '33', borderColor: INTENSITY_COLORS[n], color: INTENSITY_COLORS[n] }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#475569' }
          }
        >
          <Star className="w-4 h-4" fill={value >= n ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-bold">{n}</span>
        </button>
      ))}
    </div>
  );
}

const emptyForm = () => ({
  sighted_at: new Date().toISOString().slice(0, 16),
  location_name: '',
  intensity: 3,
  kp_at_sighting: '',
  notes: '',
});

const AuroraLog = () => {
  const { user, profile } = useAuth();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isPro = profile?.plan === 'pro' || profile?.plan === 'premium'
    || profile?.subscription_status === 'trialing';

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('aurora_sightings')
      .select('id, sighted_at, location_name, latitude, longitude, intensity, notes, kp_at_sighting, created_at')
      .eq('user_id', user.id)
      .order('sighted_at', { ascending: false });
    if (error) logError('Failed to load aurora sightings', error);
    else setSightings((data as Sighting[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('aurora_sightings').insert({
      user_id: user.id,
      sighted_at: new Date(form.sighted_at).toISOString(),
      location_name: form.location_name.trim() || null,
      intensity: form.intensity,
      kp_at_sighting: form.kp_at_sighting !== '' ? parseFloat(form.kp_at_sighting as string) : null,
      notes: form.notes.trim() || null,
    });
    if (error) {
      logError('Failed to save sighting', error);
    } else {
      setForm(emptyForm());
      setShowForm(false);
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('aurora_sightings').delete().eq('id', id);
    if (error) logError('Failed to delete sighting', error);
    else setSightings(s => s.filter(x => x.id !== id));
    setDeleteId(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-[#10b981] mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-white mb-2">Sign in to access your Aurora Log</h2>
          <Link to="/auth" className="text-[#10b981] hover:underline">Sign in →</Link>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="glass-surface rounded-3xl p-10 max-w-md text-center border border-[#10b981]/20">
          <BookOpen className="w-16 h-16 text-[#10b981] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Aurora Personal Log</h2>
          <p className="text-[#94a3b8] mb-6">Keep a diary of your aurora sightings — intensity, location, notes, and Kp at the time. Available on Pro.</p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
      <StarField />
      <PageMeta
        title="Aurora Log — The Storm Watcher"
        description="Personal diary of your aurora sightings. Log intensity, location, notes and Kp index."
        path="/log"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Aurora Log', path: '/log' }]} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 uppercase tracking-tight">
              Aurora <span className="gradient-emerald">Log</span>
            </h1>
            <p className="text-[#94a3b8]">{sightings.length} sighting{sightings.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90 mt-1"
            style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Log sighting</span>
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="glass-surface rounded-2xl p-6 border border-[#10b981]/30 mb-8 space-y-5">
            <h2 className="text-lg font-bold text-white">New sighting</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Date & time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.sighted_at}
                  onChange={e => setForm(f => ({ ...f, sighted_at: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#10b981]/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  value={form.location_name}
                  onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                  placeholder="e.g. Lapland, Finland"
                  className="w-full rounded-xl px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">Intensity</label>
              <IntensityPicker value={form.intensity} onChange={v => setForm(f => ({ ...f, intensity: v }))} />
              <p className="text-xs text-[#64748b] mt-1.5">{INTENSITY_LABELS[form.intensity]}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Kp index (optional)</label>
              <input
                type="number"
                min="0"
                max="9"
                step="0.1"
                value={form.kp_at_sighting}
                onChange={e => setForm(f => ({ ...f, kp_at_sighting: e.target.value }))}
                placeholder="e.g. 6.3"
                className="w-32 rounded-xl px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Colors, structure, duration, photos..."
                className="w-full rounded-xl px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm()); }}
                className="px-5 py-2.5 rounded-xl font-bold text-[#64748b] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-surface rounded-2xl p-5 border border-white/10 animate-pulse h-24" />
            ))}
          </div>
        ) : sightings.length === 0 ? (
          <div className="glass-surface rounded-2xl p-12 border border-white/10 text-center">
            <div className="text-5xl mb-4">🌌</div>
            <p className="text-[#94a3b8] text-lg">No sightings yet.</p>
            <p className="text-[#475569] text-sm mt-1">Click "Log sighting" to record your first aurora.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sightings.map(s => (
              <div key={s.id} className="glass-surface rounded-2xl p-5 border border-white/10 flex items-start gap-4">
                {/* Intensity badge */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-bold"
                  style={{ background: INTENSITY_COLORS[s.intensity] + '33', border: `1.5px solid ${INTENSITY_COLORS[s.intensity]}66` }}
                >
                  <span className="text-lg leading-none" style={{ color: INTENSITY_COLORS[s.intensity] }}>{s.intensity}</span>
                  <span className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: INTENSITY_COLORS[s.intensity] + 'bb' }}>int.</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold">
                      {new Date(s.sighted_at ?? s.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[#475569] text-sm">
                      {new Date(s.sighted_at ?? s.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {s.kp_at_sighting != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] font-bold">Kp {s.kp_at_sighting.toFixed(1)}</span>
                    )}
                  </div>
                  {s.location_name && (
                    <div className="flex items-center gap-1 text-[#94a3b8] text-sm mb-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {s.location_name}
                    </div>
                  )}
                  {s.notes && <p className="text-[#64748b] text-sm leading-relaxed">{s.notes}</p>}
                </div>

                {/* Delete */}
                {deleteId === s.id ? (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-[#ef4444] font-bold hover:underline">Confirm</button>
                    <button onClick={() => setDeleteId(null)} className="text-xs text-[#475569] hover:text-white">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(s.id)}
                    aria-label="Delete sighting"
                    className="flex-shrink-0 p-2 rounded-lg text-[#374151] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuroraLog;
