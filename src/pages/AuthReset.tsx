import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const scorePassword = (pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string; color: string } => {
  if (!pw) return { level: 0, label: '', color: '#475569' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const meta = [
    { label: 'Too weak', color: '#ef4444' },
    { label: 'Weak', color: '#f97316' },
    { label: 'Fair', color: '#eab308' },
    { label: 'Good', color: '#10b981' },
    { label: 'Strong', color: '#059669' },
  ][clamped];
  return { level: clamped, label: meta.label, color: meta.color };
};

export default function AuthReset() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const strength = scorePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError(t('auth.passwordMismatch') || 'Passwords do not match');
      return;
    }
    if (strength.level < 2) {
      setError(t('auth.passwordWeak') || 'Password is too weak');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('auth.newPassword') || 'Set New Password'}
          </h1>
          <p className="text-[#94a3b8] text-sm">
            {t('auth.newPasswordDesc') || 'Choose a strong password for your account.'}
          </p>
        </div>

        <div className="glass-surface rounded-2xl p-8 border border-white/10">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#10b981]" />
              </div>
              <p className="text-[#10b981] font-semibold text-lg mb-1">
                {t('auth.passwordUpdated') || 'Password updated!'}
              </p>
              <p className="text-[#94a3b8] text-sm">
                {t('auth.redirecting') || 'Redirecting to dashboard…'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                  {t('auth.newPasswordLabel') || 'New Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{ backgroundColor: i <= strength.level ? strength.color : '#1e293b' }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                  {t('auth.confirmPassword') || 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || strength.level < 2}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[#f97316]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (t('auth.updating') || 'Updating…')
                  : (t('auth.updatePassword') || 'Update Password')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
