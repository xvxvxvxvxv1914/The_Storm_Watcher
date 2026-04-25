import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, profile, updateProfile, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('nav.dashboard') || 'Dashboard'}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-[#f97316]/20 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-[#f97316]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('profile.title') || 'My Profile'}</h1>
          <p className="text-[#94a3b8] text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="glass-surface rounded-2xl p-8 border border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">{t('profile.accountInfo') || 'Account Information'}</h2>
          <p className="text-[#94a3b8] text-sm">
            {t('profile.plan') || 'Plan'}:{' '}
            <span className="font-semibold capitalize" style={{ color: profile?.plan === 'pro' ? '#f97316' : profile?.plan === 'premium' ? '#a855f7' : '#10b981' }}>
              {profile?.plan || 'free'}
            </span>
          </p>
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

      <div className="glass-surface rounded-2xl p-8 border border-[#ef4444]/20 space-y-4 mt-6">
        <h2 className="text-lg font-semibold text-[#ef4444]">{t('profile.dangerZone') || 'Danger Zone'}</h2>
        <p className="text-[#94a3b8] text-sm">{t('profile.deleteWarning') || 'Permanently delete your account and all data. This cannot be undone.'}</p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#ef4444]/40 text-[#ef4444] text-sm font-medium hover:bg-[#ef4444]/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('profile.deleteAccount') || 'Delete Account'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[#ef4444] text-sm font-semibold">{t('profile.deleteConfirm') || 'Are you sure? This is permanent.'}</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
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
                disabled={deleting}
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
