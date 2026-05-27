import { useState, useEffect, useRef } from 'react';
import PageMeta from '../components/PageMeta';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Save, ArrowLeft, Trash2, Zap, Star, CreditCard, Camera,
  Settings, Globe, Bell, LayoutDashboard, Map, ChevronRight, CalendarDays, Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

function compressImage(file: File, maxSize = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(img.width, img.height, maxSize);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('toBlob failed')); },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
  const [avatarMsg, setAvatarMsg] = useState('');

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError(t('profile.avatarError') || 'Failed to upload photo'); return; }
    setUploadingAvatar(true);
    setAvatarMsg('');
    setError('');
    try {
      const blob = await compressImage(file, 256);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
      setAvatarMsg(t('profile.avatarUpdated') || 'Photo updated!');
      setTimeout(() => setAvatarMsg(''), 3000);
    } catch {
      setError(t('profile.avatarError') || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto pb-24">
      <PageMeta
        title="Profile — The Storm Watcher"
        description="Manage your Storm Watcher profile, subscription and account settings."
        path="/profile"
        noindex
      />

      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('nav.dashboard') || 'Dashboard'}
      </Link>

      {/* ── Hero header ── */}
      <div className="relative bg-white/4 border border-white/10 rounded-2xl p-5 mb-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at top left, ${planColor}, transparent 60%)` }} />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden focus:outline-none ring-2 transition-all"
              style={{ background: `${planColor}22` }}
              title={t('profile.uploadAvatar') || 'Upload photo'}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <User className="w-9 h-9" style={{ color: planColor }} />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                {uploadingAvatar
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-xl font-bold text-white truncate">
                {profile?.full_name || t('profile.title') || 'My Profile'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide flex-shrink-0"
                style={{ background: `${planColor}22`, color: planColor }}>
                <PlanIcon className="w-3 h-3" />
                {planLabel}
              </span>
            </div>
            <p className="sentry-mask text-slate-400 text-sm truncate">{user?.email}</p>
            {avatarMsg && <p className="text-emerald-400 text-xs mt-1">{avatarMsg}</p>}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
          <CalendarDays className="w-4 h-4 text-slate-500 mx-auto mb-1" />
          <p className="text-white text-xs font-semibold">{memberSince ?? '—'}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">Member since</p>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
          <PlanIcon className="w-4 h-4 mx-auto mb-1" style={{ color: planColor }} />
          <p className="text-white text-xs font-semibold">{planLabel}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">Current plan</p>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
          <Bell className="w-4 h-4 text-slate-500 mx-auto mb-1" />
          <p className="text-white text-xs font-semibold">{isTrialing ? `${trialDaysLeft}d trial` : isPaid ? 'Active' : 'Free'}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">Status</p>
        </div>
      </div>

      {/* ── Plan card ── */}
      <div className="bg-white/4 border rounded-2xl p-4 mb-4 overflow-hidden relative" style={{ borderColor: `${planColor}44` }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: planColor }} />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{t('profile.currentPlan') || 'Current plan'}</p>
            <p className="text-white font-bold text-base flex items-center gap-2">
              <PlanIcon className="w-4 h-4" style={{ color: planColor }} />
              Storm Watcher {planLabel}
              {isTrialing && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f9731622', color: '#f97316' }}>
                  Trial
                </span>
              )}
              {isPastDue && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ef444422', color: '#ef4444' }}>
                  Past due
                </span>
              )}
            </p>
            {isTrialing && trialDaysLeft !== null && (
              <p className="text-orange-400 text-xs mt-1">
                {(t('trial.banner') || 'Your Pro trial ends in {days} days').replace('{days}', String(trialDaysLeft))}
              </p>
            )}
            {!isTrialing && isPaid && subscriptionEnd && (
              <p className="text-slate-500 text-xs mt-1">Renews {subscriptionEnd}</p>
            )}
          </div>
          {(isPaid || isTrialing || isPastDue) ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(to right, ${planColor}, ${isPremium ? '#6d28d9' : '#fbbf24'})` }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              {portalLoading ? 'Loading…' : t('profile.manageSubscription') || 'Manage'}
            </button>
          ) : (
            <Link
              to="/pricing"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              {t('profile.upgrade') || 'Upgrade'}
            </Link>
          )}
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 gap-1">
          {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.free).map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: planColor }} />
              <span className="text-slate-300 text-xs">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden mb-4">
        {QUICK_LINKS.map(({ to, icon: Icon, label }, i) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-white/6 transition-colors ${i < QUICK_LINKS.length - 1 ? 'border-b border-white/6' : ''}`}
          >
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-200 text-sm flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Link>
        ))}
      </div>

      {/* ── Account info ── */}
      <div className="bg-white/4 border border-white/8 rounded-2xl p-4 sm:p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('profile.accountInfo') || 'Account Information'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t('profile.displayName') || 'Display Name'}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              placeholder={t('profile.displayNamePlaceholder') || 'Your name'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t('profile.email') || 'Email'}
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-slate-500 text-sm cursor-not-allowed"
            />
          </div>

          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{t('profile.saved') || 'Profile saved!'}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? (t('profile.saving') || 'Saving…') : (t('profile.save') || 'Save Changes')}
          </button>
        </form>
      </div>

      {/* ── Danger zone ── */}
      <div className="bg-white/4 border border-red-500/20 rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-red-400 mb-1">{t('profile.dangerZone') || 'Danger Zone'}</h2>
        <p className="text-slate-500 text-xs mb-4">{t('profile.deleteWarning') || 'Permanently delete your account and all data. This cannot be undone.'}</p>

        {!confirmDelete ? (
          <button
            onClick={() => { setConfirmDelete(true); setDeleteEmailInput(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('profile.deleteAccount') || 'Delete Account'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-red-400 text-xs font-semibold">{t('profile.deleteConfirm') || 'Are you sure? This is permanent.'}</p>
            <p className="text-slate-500 text-xs">
              {t('profile.deleteTypeEmail') || 'Type your email to confirm:'}{' '}
              <span className="text-slate-400 font-mono">{user?.email}</span>
            </p>
            <input
              type="email"
              value={deleteEmailInput}
              onChange={e => setDeleteEmailInput(e.target.value)}
              placeholder={user?.email || ''}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-red-500/50"
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
                    setError(t('profile.deleteError') || 'Failed to delete account. Please try again.');
                    setDeleting(false);
                    setConfirmDelete(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? (t('profile.deleting') || 'Deleting…') : (t('profile.confirmDelete') || 'Yes, delete everything')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:bg-white/5 transition-colors"
              >
                {t('profile.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
