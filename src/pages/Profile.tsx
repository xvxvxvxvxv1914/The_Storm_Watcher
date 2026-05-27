import { useState, useEffect, useRef } from 'react';
import PageMeta from '../components/PageMeta';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Save, Trash2, Zap, Star, CreditCard, Camera,
  Settings, Globe, Bell, Map, Shield,
  LayoutDashboard, ArrowLeft, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AvatarCropper from '../components/AvatarCropper';
import StarField from '../components/StarField';

const PLAN_CONFIG = {
  free: {
    label: 'Free',
    color: '#10b981',
    color2: '#059669',
    gradient: 'from-emerald-500 to-teal-400',
    bgGradient: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    glow: 'glow-green',
    icon: Shield,
  },
  pro: {
    label: 'Pro',
    color: '#f97316',
    color2: '#fbbf24',
    gradient: 'from-orange-500 to-amber-400',
    bgGradient: 'from-orange-500/20 via-amber-500/8 to-transparent',
    glow: 'glow-orange',
    icon: Zap,
  },
  premium: {
    label: 'Premium',
    color: '#a855f7',
    color2: '#7c3aed',
    gradient: 'from-purple-500 to-violet-400',
    bgGradient: 'from-purple-500/20 via-violet-500/8 to-transparent',
    glow: 'glow-purple',
    icon: Star,
  },
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['Live Kp index', 'Aurora forecasts', 'UV & sun times', 'ISS tracking', 'Sky visibility'],
  pro: ['Everything in Free', 'Storm alerts', 'Aurora gallery & hunt', 'Advanced charts'],
  premium: ['Everything in Pro', 'Priority support', 'Early feature access'],
};

const QUICK_LINKS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', sub: 'Live data', color: '#10b981' },
  { to: '/aurora-map', icon: Map, label: 'Aurora Map', sub: 'Visibility', color: '#7c3aed' },
  { to: '/alerts', icon: Bell, label: 'Storm Alerts', sub: 'Kp pings', color: '#f97316' },
  { to: '/settings', icon: Settings, label: 'Settings', sub: 'Preferences', color: '#06b6d4' },
  { to: '/settings/language', icon: Globe, label: 'Language', sub: '16 langs', color: '#ec4899' },
];

export default function Profile() {
  const { user, profile, updateProfile, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const plan = (profile?.plan ?? 'free') as keyof typeof PLAN_CONFIG;
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
  const isPro = plan === 'pro';
  const isPremium = plan === 'premium';
  const isPaid = isPro || isPremium;
  const isTrialing = profile?.subscription_status === 'trialing';
  const isPastDue = profile?.subscription_status === 'past_due';
  const PlanIcon = cfg.icon;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null;

  const daysAsMember = profile?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000))
    : null;

  const periodEndRaw = profile?.subscription_period_end;
  const periodEndDate = periodEndRaw ? new Date(periodEndRaw as unknown as string) : null;
  const subscriptionEnd = periodEndDate && !isNaN(periodEndDate.getTime())
    ? periodEndDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const trialDaysLeft = isTrialing && periodEndDate
    ? Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / 86_400_000))
    : null;

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json() as { url?: string };
      if (data.url && /^https:\/\/billing\.stripe\.com\//.test(data.url)) window.location.href = data.url;
    } catch {
      setFormError(t('profile.portalError') || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setFormError('Please select an image file'); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!user) return;
    setCropSrc(null);
    setUploadingAvatar(true);
    setFormError('');
    try {
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
    } catch {
      setFormError('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);
  useEffect(() => { if (profile?.full_name) setFullName(profile.full_name); }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess(false);
    setSaving(true);
    const trimmed = fullName.trim();
    if (!trimmed) { setFormError('Name cannot be empty'); setSaving(false); return; }
    const { error } = await updateProfile({ full_name: trimmed });
    setSaving(false);
    if (error) { setFormError(error.message); } else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a1a]">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {cropSrc && <AvatarCropper imageSrc={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}

      <div className="min-h-screen bg-[#0a0a1a] pb-28 relative">
        <PageMeta title="Profile — The Storm Watcher" description="Manage your profile and subscription." path="/profile" noindex />

        <StarField />
        <div className="solar-orb" style={{ top: '-200px', right: '-300px' }} />
        <div className="magnetic-orb" style={{ top: '40%', left: '-250px' }} />

        {/* ── Top nav ── */}
        <div className="sticky top-0 z-20 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 h-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
            <span className="ml-6 text-white text-sm font-semibold tracking-[0.2em]">PROFILE</span>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-10 space-y-4">

          {/* ── Hero card ── */}
          <div className={`relative glass-surface rounded-3xl overflow-hidden ${cfg.glow}`}>
            {/* Animated aurora blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className={`absolute -top-32 -left-20 w-72 h-72 lg:w-[28rem] lg:h-[28rem] rounded-full opacity-40 blur-3xl bg-gradient-to-br ${cfg.bgGradient}`}
              />
              <div
                className="absolute -bottom-20 -right-10 w-56 h-56 lg:w-80 lg:h-80 rounded-full opacity-30 blur-3xl"
                style={{ background: cfg.color }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a1a]/40" />
            </div>

            <div className="relative p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0">
                  {/* Avatar with conic ring */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="relative flex-shrink-0 w-24 h-24 lg:w-32 lg:h-32 rounded-full focus:outline-none group"
                  >
                    <div
                      className="absolute -inset-1 rounded-full opacity-80 animate-pulse"
                      style={{
                        background: `conic-gradient(from 0deg, ${cfg.color}, ${cfg.color2}, ${cfg.color}, transparent, ${cfg.color})`,
                      }}
                    />
                    <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0a0a1a] border-2 border-[#0a0a1a]">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: `radial-gradient(circle, ${cfg.color}28, ${cfg.color}08)` }}
                        >
                          <User className="w-10 h-10 lg:w-14 lg:h-14" style={{ color: cfg.color }} />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploadingAvatar
                          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <Camera className="w-5 h-5 lg:w-6 lg:h-6 text-white" />}
                      </div>
                    </div>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold text-white truncate leading-tight">
                      {profile?.full_name || user?.email?.split('@')[0] || 'Profile'}
                    </h1>
                    <p className="sentry-mask text-[#94a3b8] text-sm lg:text-base truncate mt-0.5">{user?.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${cfg.gradient}`}
                        style={{ boxShadow: `0 4px 20px ${cfg.color}40` }}
                      >
                        <PlanIcon className="w-3 h-3" />
                        {cfg.label}
                        {isTrialing && <span className="opacity-80">· Trial</span>}
                      </div>
                      {memberSince && (
                        <span className="text-[#64748b] text-[11px]">
                          Joined {memberSince}
                          {isPastDue && <span className="ml-2 text-red-400 font-medium">· Past due</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Member stats row */}
                <div className="grid grid-cols-3 gap-2 pt-5 lg:pt-0 lg:pb-0 border-t lg:border-t-0 lg:border-l border-white/8 lg:pl-8 lg:flex-shrink-0">
                  <div className="text-left lg:text-center lg:px-4">
                    <div className="text-2xl lg:text-3xl font-bold text-white">{daysAsMember ?? '—'}</div>
                    <div className="text-[10px] text-[#64748b] uppercase tracking-wider mt-0.5">Days</div>
                  </div>
                  <div className="text-left lg:text-center lg:px-4 lg:border-x border-white/8">
                    <div className="text-2xl lg:text-3xl font-bold gradient-solar">{cfg.label[0]}</div>
                    <div className="text-[10px] text-[#64748b] uppercase tracking-wider mt-0.5">Plan</div>
                  </div>
                  <div className="text-left lg:text-center lg:px-4">
                    <div className="text-2xl lg:text-3xl font-bold text-white">
                      {isPaid ? <Sparkles className="w-6 h-6 lg:w-7 lg:h-7 inline" style={{ color: cfg.color }} /> : '✦'}
                    </div>
                    <div className="text-[10px] text-[#64748b] uppercase tracking-wider mt-0.5">Status</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Two-column body ── */}
          <div className="grid lg:grid-cols-3 gap-4">

          {/* LEFT (wider) ── Quick links + Account ── */}
          <div className="lg:col-span-2 space-y-4 lg:order-1 order-2">

          {/* ── Quick links grid ── */}
          <div>
            <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-[0.2em] px-1 mb-2">Navigate</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 lg:gap-3">
              {QUICK_LINKS.map(({ to, icon: Icon, label, sub, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="group glass-surface rounded-2xl p-3.5 lg:p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform relative overflow-hidden"
                >
                  <div
                    className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-25 blur-2xl transition-opacity"
                    style={{ background: color }}
                  />
                  <div className="relative flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] font-bold leading-tight">{label}</p>
                      <p className="text-[#64748b] text-[11px] mt-0.5">{sub}</p>
                    </div>
                  </div>
                </Link>
              ))}
              <Link
                to="/pricing"
                className="group glass-surface rounded-2xl p-3.5 lg:p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform relative overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-25 group-hover:opacity-40 blur-2xl transition-opacity bg-gradient-to-br from-orange-500 to-amber-400" />
                <div className="relative flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-400"
                    style={{ boxShadow: '0 4px 16px #f9731640' }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-bold leading-tight">Plans</p>
                    <p className="text-[#64748b] text-[11px] mt-0.5">Free · Pro · Premium</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* ── Account info ── */}
          <div className="glass-surface rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-1">
              <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-[0.2em]">Account</p>
            </div>
            <form onSubmit={handleSubmit} className="px-4 pb-4 pt-3 space-y-3">
              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1.5 font-semibold uppercase tracking-wider">Display name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  maxLength={80}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-700 focus:outline-none focus:border-emerald-500/40 focus:bg-white/7 transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1.5 font-semibold uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-white/3 border border-white/6 rounded-xl text-slate-600 text-sm cursor-not-allowed"
                />
              </div>
              {formError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{formError}</div>
              )}
              {success && (
                <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Changes saved successfully.
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ boxShadow: '0 4px 16px #10b98140' }}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>

          </div>
          {/* END LEFT */}

          {/* RIGHT ── Subscription + Danger ── */}
          <div className="lg:col-span-1 space-y-4 lg:order-2 order-1">

          {/* ── Subscription card ── */}
          <div className={`relative glass-surface rounded-2xl overflow-hidden ${isPaid || isTrialing ? cfg.glow : ''}`}>
            <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.gradient}`} />
            <div
              className="absolute -top-16 right-0 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ background: cfg.color }}
            />
            <div className="relative p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}
                    style={{ boxShadow: `0 4px 16px ${cfg.color}40` }}
                  >
                    <PlanIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Storm Watcher {cfg.label}</p>
                    {isTrialing && trialDaysLeft !== null && (
                      <p className="text-orange-400 text-[11px] mt-0.5 font-medium">{trialDaysLeft} days left in trial</p>
                    )}
                    {!isTrialing && isPaid && subscriptionEnd && (
                      <p className="text-[#64748b] text-[11px] mt-0.5">Renews {subscriptionEnd}</p>
                    )}
                    {!isPaid && !isTrialing && (
                      <p className="text-[#64748b] text-[11px] mt-0.5">Unlock more features</p>
                    )}
                  </div>
                </div>
                {(isPaid || isTrialing || isPastDue) ? (
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${cfg.gradient} disabled:opacity-50 hover:opacity-90 transition-opacity`}
                    style={{ boxShadow: `0 4px 16px ${cfg.color}40` }}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {portalLoading ? '...' : 'Manage'}
                  </button>
                ) : (
                  <Link
                    to="/pricing"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:opacity-90 transition-opacity"
                    style={{ boxShadow: '0 4px 16px #f9731640' }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Upgrade
                  </Link>
                )}
              </div>
              <div className="space-y-1.5">
                {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.free).map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.color }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Danger zone ── */}
          <div className="glass-surface rounded-2xl overflow-hidden border-red-500/10">
            <div className="px-4 pt-4 pb-1">
              <p className="text-red-400/70 text-[10px] font-bold uppercase tracking-[0.2em]">Danger zone</p>
            </div>
            <div className="px-4 pb-4 pt-3">
              {!confirmDelete ? (
                <button
                  onClick={() => { setConfirmDelete(true); setDeleteEmailInput(''); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/8 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[#cbd5e1] text-sm">This will permanently delete your account and all associated data. This action cannot be undone.</p>
                  <p className="text-[#64748b] text-xs">
                    Type <span className="font-mono text-slate-400">{user?.email}</span> to confirm:
                  </p>
                  <input
                    type="email"
                    value={deleteEmailInput}
                    onChange={e => setDeleteEmailInput(e.target.value)}
                    placeholder={user?.email || ''}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-red-500/40"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={deleting || deleteEmailInput !== user?.email}
                      onClick={async () => {
                        if (deleteEmailInput !== user?.email) return;
                        setDeleting(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
                          const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                          });
                          if (!res.ok) throw new Error('delete failed');
                          await supabase.auth.signOut();
                          navigate('/');
                        } catch {
                          setFormError('Failed to delete account. Please try again.');
                          setDeleting(false);
                          setConfirmDelete(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                      style={{ boxShadow: '0 4px 16px #ef444440' }}
                    >
                      {deleting ? 'Deleting…' : 'Delete everything'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-5 py-2.5 rounded-xl bg-white/6 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          </div>
          {/* END RIGHT */}

          </div>
          {/* END grid */}

        </div>
      </div>
    </>
  );
}
