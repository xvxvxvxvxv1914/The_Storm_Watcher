import { useState, useEffect, useRef } from 'react';
import PageMeta from '../components/PageMeta';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Save, Trash2, Zap, Star, CreditCard, Camera,
  Settings, Globe, Bell, Map, ChevronRight, Shield,
  LayoutDashboard, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AvatarCropper from '../components/AvatarCropper';

const PLAN_CONFIG = {
  free:    { label: 'Free',    color: '#10b981', gradient: 'from-emerald-500 to-teal-400',    icon: Shield },
  pro:     { label: 'Pro',     color: '#f97316', gradient: 'from-orange-500 to-amber-400',    icon: Zap    },
  premium: { label: 'Premium', color: '#a855f7', gradient: 'from-purple-500 to-violet-400',   icon: Star   },
};

const PLAN_FEATURES: Record<string, string[]> = {
  free:    ['Live Kp index', 'Aurora forecasts', 'UV & sun times', 'ISS tracking', 'Sky visibility'],
  pro:     ['Everything in Free', 'Storm alerts', 'Aurora gallery & hunt', 'Advanced charts'],
  premium: ['Everything in Pro', 'Priority support', 'Early feature access'],
};

const QUICK_LINKS = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard',        sub: 'Live space weather' },
  { to: '/settings',          icon: Settings,        label: 'Settings',         sub: 'App preferences' },
  { to: '/settings/language', icon: Globe,           label: 'Language',         sub: '16 languages' },
  { to: '/alerts',            icon: Bell,            label: 'Storm Alerts',     sub: 'Kp notifications' },
  { to: '/aurora-map',        icon: Map,             label: 'Aurora Map',       sub: 'Visibility heatmap' },
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {cropSrc && <AvatarCropper imageSrc={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}

      <div className="min-h-screen bg-[#0a0a1a] pb-28">
        <PageMeta title="Profile — The Storm Watcher" description="Manage your profile and subscription." path="/profile" noindex />

        {/* ── Top nav ── */}
        <div className="sticky top-0 z-10 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <span className="mx-auto text-white text-sm font-semibold">Profile</span>
          <div className="w-12" />
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 space-y-3">

          {/* ── Hero card ── */}
          <div className="relative rounded-2xl overflow-hidden border border-white/8">
            {/* Aurora background */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
                style={{ background: cfg.color }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/4 to-transparent" />
            </div>

            <div className="relative p-5 pb-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="relative flex-shrink-0 w-20 h-20 rounded-full focus:outline-none group"
                >
                  <div
                    className="absolute -inset-0.5 rounded-full opacity-70"
                    style={{ background: `conic-gradient(${cfg.color}, transparent, ${cfg.color})` }}
                  />
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0a0a1a]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                        <User className="w-8 h-8" style={{ color: cfg.color }} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar
                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Camera className="w-5 h-5 text-white" />}
                    </div>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-white truncate leading-tight">
                    {profile?.full_name || user?.email?.split('@')[0] || 'Profile'}
                  </h1>
                  <p className="sentry-mask text-slate-400 text-sm truncate mt-0.5">{user?.email}</p>
                  <div
                    className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r text-white ${cfg.gradient}`}
                  >
                    <PlanIcon className="w-3 h-3" />
                    {cfg.label}
                    {isTrialing && <span className="opacity-70">· Trial</span>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {memberSince && (
                <p className="text-slate-600 text-xs mt-4 pt-4 border-t border-white/5">
                  Member since {memberSince}
                  {isPastDue && <span className="ml-3 text-red-400 font-medium">· Payment past due</span>}
                </p>
              )}
            </div>
          </div>

          {/* ── Subscription card ── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
            <div className={`h-px w-full bg-gradient-to-r ${cfg.gradient}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">Storm Watcher {cfg.label}</p>
                  {isTrialing && trialDaysLeft !== null && (
                    <p className="text-orange-400 text-xs mt-0.5">{trialDaysLeft} days remaining in trial</p>
                  )}
                  {!isTrialing && isPaid && subscriptionEnd && (
                    <p className="text-slate-500 text-xs mt-0.5">Renews {subscriptionEnd}</p>
                  )}
                  {!isPaid && !isTrialing && (
                    <p className="text-slate-500 text-xs mt-0.5">Upgrade to unlock more features</p>
                  )}
                </div>
                {(isPaid || isTrialing || isPastDue) ? (
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r ${cfg.gradient} disabled:opacity-50 hover:opacity-90 transition-opacity`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {portalLoading ? 'Loading…' : 'Manage'}
                  </button>
                ) : (
                  <Link
                    to="/pricing"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:opacity-90 transition-opacity"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Upgrade
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.free).map(f => (
                  <span
                    key={f}
                    className="text-xs px-2.5 py-1 rounded-full border border-white/8 text-slate-400"
                    style={{ background: `${cfg.color}0d` }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Quick links ── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="px-4 pt-3.5 pb-1">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Navigate</p>
            </div>
            {QUICK_LINKS.map(({ to, icon: Icon, label, sub }, i) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/4 active:bg-white/6 transition-colors ${i < QUICK_LINKS.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/6 border border-white/8 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-tight">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* ── Account info ── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="px-4 pt-3.5 pb-1">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Account information</p>
            </div>
            <form onSubmit={handleSubmit} className="px-4 pb-4 pt-3 space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Display name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  maxLength={80}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-700 focus:outline-none focus:border-white/25 focus:bg-white/7 transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Email address</label>
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
                <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">Changes saved successfully.</div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-40 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>

          {/* ── Danger zone ── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="px-4 pt-3.5 pb-1">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Danger zone</p>
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
                  <p className="text-slate-300 text-sm">This will permanently delete your account and all associated data. This action cannot be undone.</p>
                  <p className="text-slate-500 text-xs">
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
                      className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40"
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
      </div>
    </>
  );
}
