import { useState, useEffect, useRef } from 'react';
import PageMeta from '../components/PageMeta';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Save, ArrowLeft, Trash2, Zap, Star, CreditCard, Camera,
  Settings, Globe, Bell, Map, ChevronRight, CalendarDays, Shield,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AvatarCropper from '../components/AvatarCropper';

const PLAN_FEATURES: Record<string, string[]> = {
  free:    ['Live Kp index', 'Aurora forecasts', 'UV & sun times', 'ISS tracking', 'Sky visibility'],
  pro:     ['Everything in Free', 'Storm alerts', 'Aurora photo gallery', 'Aurora hunt', 'Advanced charts'],
  premium: ['Everything in Pro', 'Priority support', 'Early access to new features'],
};

const QUICK_LINKS = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/settings',          icon: Settings,        label: 'Settings' },
  { to: '/settings/language', icon: Globe,           label: 'Language' },
  { to: '/alerts',            icon: Bell,            label: 'Alerts' },
  { to: '/aurora-map',        icon: Map,             label: 'Aurora Map' },
];

export default function Profile() {
  const { user, profile, updateProfile, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const plan = profile?.plan ?? 'free';
  const isPro = plan === 'pro';
  const isPremium = plan === 'premium';
  const isPaid = isPro || isPremium;
  const isTrialing = profile?.subscription_status === 'trialing';
  const isPastDue = profile?.subscription_status === 'past_due';

  const planColor = isPremium ? '#a855f7' : isPro ? '#f97316' : '#10b981';
  const planLabel = isPremium ? 'Premium' : isPro ? 'Pro' : 'Free';
  const PlanIcon = isPremium ? Star : isPro ? Zap : Shield;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
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
      setError(t('profile.portalError') || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError(t('profile.avatarError') || 'Invalid file type'); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!user) return;
    setCropSrc(null);
    setUploadingAvatar(true);
    setError('');
    try {
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
    } catch {
      setError(t('profile.avatarError') || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    const trimmed = fullName.trim();
    if (!trimmed) { setError(t('profile.nameRequired') || 'Name cannot be empty'); setSaving(false); return; }
    const { error } = await updateProfile({ full_name: trimmed });
    setSaving(false);
    if (error) { setError(error.message); } else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="min-h-screen px-4 py-8 pb-28 max-w-lg mx-auto">
        <PageMeta
          title="Profile — The Storm Watcher"
          description="Manage your Storm Watcher profile, subscription and account settings."
          path="/profile"
          noindex
        />

        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-7">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {/* ── Profile hero ── */}
        <div className="relative rounded-3xl overflow-hidden mb-5">
          {/* Background gradient */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${planColor}18 0%, transparent 60%), #0f0f1f` }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${planColor}60, transparent)` }} />

          <div className="relative px-5 pt-6 pb-5">
            <div className="flex items-end gap-4 mb-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white/10 hover:ring-white/30 transition-all group focus:outline-none"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: `${planColor}22` }}>
                      <User className="w-9 h-9" style={{ color: planColor }} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />}
                  </div>
                </button>
                <div className="absolute -bottom-1 -right-1 rounded-full p-1" style={{ background: planColor }}>
                  <PlanIcon className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-bold text-white truncate leading-tight">
                  {profile?.full_name || 'My Profile'}
                </h1>
                <p className="sentry-mask text-slate-400 text-sm truncate mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-white text-xs font-semibold leading-tight">{memberSince ?? '—'}</p>
                <p className="text-slate-600 text-[10px] mt-0.5">Joined</p>
              </div>
              <div className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                <PlanIcon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: planColor }} />
                <p className="text-xs font-bold leading-tight" style={{ color: planColor }}>{planLabel}</p>
                <p className="text-slate-600 text-[10px] mt-0.5">Plan</p>
              </div>
              <div className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-1.5 mt-0.5 ${isPaid ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <p className="text-white text-xs font-semibold leading-tight">
                  {isTrialing ? `${trialDaysLeft}d left` : isPaid ? 'Active' : 'Free'}
                </p>
                <p className="text-slate-600 text-[10px] mt-0.5">Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Plan card ── */}
        <div className="rounded-2xl border overflow-hidden mb-3" style={{ borderColor: `${planColor}33`, background: `${planColor}08` }}>
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${planColor}, ${isPremium ? '#6d28d9' : isPro ? '#fbbf24' : '#059669'})` }} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium mb-1">Current plan</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-bold text-sm">Storm Watcher {planLabel}</p>
                  {isTrialing && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f9731622', color: '#f97316' }}>Trial</span>
                  )}
                  {isPastDue && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Past due</span>
                  )}
                </div>
                {isTrialing && trialDaysLeft !== null && (
                  <p className="text-orange-400 text-xs mt-1">{trialDaysLeft} days remaining in trial</p>
                )}
                {!isTrialing && isPaid && subscriptionEnd && (
                  <p className="text-slate-500 text-xs mt-1">Renews {subscriptionEnd}</p>
                )}
              </div>
              {(isPaid || isTrialing || isPastDue) ? (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
                  style={{ background: `linear-gradient(135deg, ${planColor}, ${isPremium ? '#6d28d9' : '#fbbf24'})` }}
                >
                  <CreditCard className="w-3 h-3" />
                  {portalLoading ? '…' : 'Manage'}
                </button>
              ) : (
                <Link
                  to="/pricing"
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-br from-orange-500 to-amber-400 hover:opacity-90 transition-opacity"
                >
                  <Zap className="w-3 h-3" />
                  Upgrade
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.free).map(f => (
                <span key={f} className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: planColor }} />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Quick links ── */}
        <div className="rounded-2xl border border-white/8 overflow-hidden mb-3 bg-white/3">
          {QUICK_LINKS.map(({ to, icon: Icon, label }, i) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/8 transition-colors ${i < QUICK_LINKS.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="w-7 h-7 rounded-lg bg-white/6 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-slate-200 text-sm flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </Link>
          ))}
        </div>

        {/* ── Account form ── */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4 mb-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Account</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Display name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                maxLength={80}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/7 transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 bg-white/3 border border-white/6 rounded-xl text-slate-600 text-sm cursor-not-allowed"
              />
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
            {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">Changes saved!</p>}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-medium hover:bg-emerald-500/22 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* ── Danger zone ── */}
        <div className="rounded-2xl border border-red-500/15 bg-red-500/3 p-4">
          <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">Danger zone</p>
          <p className="text-slate-600 text-xs mb-4">Permanently deletes your account and all data.</p>

          {!confirmDelete ? (
            <button
              onClick={() => { setConfirmDelete(true); setDeleteEmailInput(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete account
            </button>
          ) : (
            <div className="space-y-2.5">
              <p className="text-red-400 text-xs font-medium">This cannot be undone. Type your email to confirm:</p>
              <p className="text-slate-500 text-xs font-mono">{user?.email}</p>
              <input
                type="email"
                value={deleteEmailInput}
                onChange={e => setDeleteEmailInput(e.target.value)}
                placeholder={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500/40"
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
                      setError(t('profile.deleteError') || 'Failed to delete account.');
                      setDeleting(false);
                      setConfirmDelete(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
