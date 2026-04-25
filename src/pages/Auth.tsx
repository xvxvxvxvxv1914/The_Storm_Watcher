import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

// Rough password strength — not a replacement for the server-side policy, but
// enough to steer users away from "password123" in the signup form.
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

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, signOut, signInWithGoogle, signInWithFacebook, signInWithApple, resetPassword } = useAuth();
  const { t } = useLanguage();

  const strength = useMemo(() => scorePassword(password), [password]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) setError(error.message);
        else { track('password_reset_requested'); setResetSent(true); }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setError(error.message);
        } else {
          track('signup_success', { method: 'email' });
          await signOut();
          setConfirmationSent(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
        else { track('login_success', { method: 'email' }); navigate('/dashboard'); }
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setLoading(true);
    track('login_attempt', { method: provider });
    const fn = provider === 'google' ? signInWithGoogle : provider === 'facebook' ? signInWithFacebook : signInWithApple;
    const { error } = await fn();
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // on success Supabase redirects — no further state needed.
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#f97316] to-[#fbbf24] rounded-full mb-6">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('auth.checkEmail')}</h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              {t('auth.checkEmailSent')} <span className="text-white font-medium">{email}</span>. {t('auth.checkEmailActivate')}
            </p>
            <p className="text-slate-500 text-sm">{t('auth.checkEmailSpam')}</p>
            <button
              onClick={() => { setConfirmationSent(false); setMode('login'); }}
              className="mt-6 text-[#f97316] hover:text-[#fbbf24] text-sm font-medium transition"
            >
              {t('auth.backToSignIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-6">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              If an account exists for <span className="text-white font-medium">{email}</span>, a password reset link has been sent.
            </p>
            <p className="text-slate-500 text-sm">{t('auth.checkEmailSpam')}</p>
            <button
              onClick={() => { setResetSent(false); setMode('login'); }}
              className="mt-6 text-[#f97316] hover:text-[#fbbf24] text-sm font-medium transition inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToSignIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title = mode === 'forgot' ? 'Reset your password' : mode === 'signup' ? t('auth.signUp') : t('auth.signIn');
  const description = mode === 'forgot'
    ? 'Enter your email and we will send you a reset link.'
    : mode === 'signup' ? t('auth.signUpDescription') : t('auth.signInDescription');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 border border-slate-700">
          <div className="text-center mb-5 sm:mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-3 sm:mb-4">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-white font-bold leading-tight text-[clamp(1.25rem,4.8vw,2rem)]">{title}</h1>
          </div>

          {mode !== 'forgot' && (
            <>
              <div className="grid grid-cols-2 mb-5 sm:mb-6 bg-slate-700/40 rounded-lg p-1 sm:p-1.5 min-h-[40px] sm:min-h-[46px] gap-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className={`min-w-0 flex items-center justify-center py-2 px-2 sm:px-3 text-[clamp(0.72rem,2.7vw,0.92rem)] sm:text-sm leading-none font-semibold rounded-md border transition-all whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/40 shadow-lg'
                      : 'text-slate-200 border-slate-500/40 hover:text-white hover:border-slate-400/60'
                  }`}
                >
                  {t('auth.signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className={`min-w-0 flex items-center justify-center py-2 px-2 sm:px-3 text-[clamp(0.72rem,2.7vw,0.92rem)] sm:text-sm leading-none font-semibold rounded-md border transition-all whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/40 shadow-lg'
                      : 'text-slate-200 border-slate-500/40 hover:text-white hover:border-slate-400/60'
                  }`}
                >
                  {t('auth.signUp')}
                </button>
              </div>

              <div className="space-y-2 mb-5">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('apple')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-slate-900 transition border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AppleIcon />
                  Continue with Apple
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('facebook')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-[#1877F2] text-white font-medium hover:bg-[#145ab8] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FacebookIcon />
                  Continue with Facebook
                </button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500 uppercase tracking-wider">{t('auth.orContinueWith')}</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
            </>
          )}

          <p className="text-slate-400 text-center text-sm mb-6">{description}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.fullName')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('auth.fullNamePlaceholder')}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">{t('auth.password')}</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setPassword(''); }}
                      className="text-xs text-[#f97316] hover:text-[#fbbf24] transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    minLength={8}
                  />
                </div>
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${(strength.level / 4) * 100}%`, background: strength.color }}
                      />
                    </div>
                    <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && strength.level < 2)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading
                ? t('auth.loading')
                : mode === 'forgot' ? 'Send reset link'
                : mode === 'signup' ? t('auth.signUp')
                : t('auth.signIn')}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="w-full text-center text-sm text-slate-400 hover:text-white transition inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('auth.backToSignIn')}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
