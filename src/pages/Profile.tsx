import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Trash2, Zap, Star, CreditCard, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

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

  const planColor = isPremium ? '#a855f7' : isPro ? '#f97316' : '#10b981';
  const PlanIcon = isPremium ? Star : isPro ? Zap : null;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const subscriptionEnd = profile?.subscription_period_end
    ? new Date(profile.subscription_period_end * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
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
    if (!file.type.startsWith('image/')) {
      setError(t('profile.avatarError') || 'Failed to upload photo');
      return;
    }
    setUploadingAvatar(true);
    setAvatarMsg('');
    setError('');
    try {
      const blob = await compressImage(file, 256);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
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
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setError(t('profile.nameRequired') || 'Name cannot be empty');
      setSaving(false);
      return;
    }

    const { error } = await updateProfile({ full_name: trimmed });
    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <div className="w-10 h-10 border-4 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-20 max-w-2xl mx-auto">
      <Helmet>
        <title>Profile — The Storm Watcher</title>
        <meta name="description" content="Manage your Storm Watcher profile, subscription and account settings." />
        <link rel="canonical" href="https://thestormwatcher.com/profile" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('nav.dashboard') || 'Dashboard'}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="relative group">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#f97316]/50"
            style={{ background: `${planColor}22` }}
            title={t('profile.uploadAvatar') || 'Upload photo'}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8" style={{ color: planColor }} />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{t('profile.title') || 'My Profile'}</h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{ background: `${planColor}22`, color: planColor }}
            >
              {PlanIcon && <PlanIcon className="w-3 h-3" />}
              {plan}
            </span>
          </div>
          <p className="text-[#94a3b8] text-sm">{user?.email}</p>
          {memberSince && (
            <p className="text-[#475569] text-xs mt-0.5">
              {t('profile.memberSince') || 'Member since'} {memberSince}
            </p>
          )}
        </div>
      </div>

      {avatarMsg && (
        <p className="text-[#10b981] text-sm bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 mb-4">
          {avatarMsg}
        </p>
      )}

      {/* Subscription card */}
      <div className="glass-surface rounded-2xl p-4 sm:p-6 border mb-4" style={{ borderColor: `${planColor}33` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[#94a3b8] text-xs uppercase tracking-widest mb-1">
              {t('profile.currentPlan') || 'Current plan'}
            </p>
            <p className="text-white font-bold text-lg capitalize flex items-center gap-2">
              {PlanIcon && <PlanIcon className="w-4 h-4" style={{ color: planColor }} />}
              Storm Watcher {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </p>
            {isPaid && subscriptionEnd && (
              <p className="text-[#475569] text-xs mt-1">
                {t('profile.subscriptionEnds') || 'Subscription ends'} {subscriptionEnd}
              </p>
            )}
          </div>
          {isPaid ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(to right, ${planColor}, ${isPremium ? '#6d28d9' : '#fbbf24'})` }}
            >
              <CreditCard className="w-4 h-4" />
              {portalLoading ? (t('app.loading') || 'Loading…') : (t('profile.manageSubscription') || 'Manage subscription')}
            </button>
          ) : (
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(to right, #f97316, #fbbf24)' }}
            >
              <Zap className="w-4 h-4" />
              {t('profile.upgrade') || 'Upgrade'}
            </Link>
          )}
        </div>
      </div>

      <div className="glass-surface rounded-2xl p-4 sm:p-8 border border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">{t('profile.accountInfo') || 'Account Information'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">
              {t('profile.displayName') || 'Display Name'}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
              placeholder={t('profile.displayNamePlaceholder') || 'Your name'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">
              {t('profile.email') || 'Email'}
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#475569] cursor-not-allowed"
            />
          </div>

          {error && (
            <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-[#10b981] text-sm bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2">
              {t('profile.saved') || 'Profile saved!'}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[#f97316]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? (t('profile.saving') || 'Saving…') : (t('profile.save') || 'Save Changes')}
          </button>
        </form>
      </div>

      <div className="glass-surface rounded-2xl p-4 sm:p-8 border border-[#ef4444]/20 space-y-4 mt-6">
        <h2 className="text-lg font-semibold text-[#ef4444]">{t('profile.dangerZone') || 'Danger Zone'}</h2>
        <p className="text-[#94a3b8] text-sm">{t('profile.deleteWarning') || 'Permanently delete your account and all data. This cannot be undone.'}</p>

        {!confirmDelete ? (
          <button
            onClick={() => { setConfirmDelete(true); setDeleteEmailInput(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#ef4444]/40 text-[#ef4444] text-sm font-medium hover:bg-[#ef4444]/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('profile.deleteAccount') || 'Delete Account'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[#ef4444] text-sm font-semibold">{t('profile.deleteConfirm') || 'Are you sure? This is permanent.'}</p>
            <p className="text-[#64748b] text-xs">{t('profile.deleteTypeEmail') || 'Type your email address to confirm:'} <span className="text-[#94a3b8] font-mono">{user?.email}</span></p>
            <input
              type="email"
              value={deleteEmailInput}
              onChange={e => setDeleteEmailInput(e.target.value)}
              placeholder={user?.email || ''}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#ef4444]/50"
            />
            <div className="flex gap-3">
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
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                      },
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
                className="px-5 py-2.5 rounded-xl bg-[#ef4444] text-white text-sm font-semibold hover:bg-[#dc2626] transition-colors disabled:opacity-50"
              >
                {deleting ? (t('profile.deleting') || 'Deleting…') : (t('profile.confirmDelete') || 'Yes, delete everything')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-[#94a3b8] text-sm font-medium hover:text-white hover:bg-white/5 transition-colors"
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
