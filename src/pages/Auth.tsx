import { useMemo, useState } from 'react';
import PageMeta from '../components/PageMeta';
import { useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, Lock, User, ArrowLeft, Zap } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

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
  const { signIn, signUp, signOut, resetPassword } = useAuth();
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

if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="magnetic-orb" style={{ top: '-80px', right: '-120px' }} />
        <div className="solar-orb" style={{ bottom: '-100px', left: '-100px' }} />
        <div className="max-w-md w-full relative z-10">
          <div className="glass-surface rounded-3xl p-8 border border-white/10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#f97316] to-[#fbbf24] rounded-full mb-6 glow-orange">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('auth.checkEmail')}</h2>
            <p className="text-[#94a3b8] mb-6 leading-relaxed">
              {t('auth.checkEmailSent')} <span className="text-white font-medium">{email}</span>. {t('auth.checkEmailActivate')}
            </p>
            <p className="text-[#475569] text-sm">{t('auth.checkEmailSpam')}</p>
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
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="magnetic-orb" style={{ top: '-80px', right: '-120px' }} />
        <div className="solar-orb" style={{ bottom: '-100px', left: '-100px' }} />
        <div className="max-w-md w-full relative z-10">
          <div className="glass-surface rounded-3xl p-8 border border-white/10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full mb-6 glow-green">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('auth.resetCheckEmail')}</h2>
            <p className="text-[#94a3b8] mb-6 leading-relaxed">
              {t('auth.resetEmailSent').split('{email}')[0]}
              <span className="text-white font-medium">{email}</span>
              {t('auth.resetEmailSent').split('{email}')[1]}
            </p>
            <p className="text-[#475569] text-sm">{t('auth.checkEmailSpam')}</p>
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

  const title = mode === 'forgot' ? t('auth.resetTitle') : mode === 'signup' ? t('auth.signUp') : t('auth.signIn');
  const description = mode === 'forgot'
    ? t('auth.resetDescription')
    : mode === 'signup' ? t('auth.signUpDescription') : t('auth.signInDescription');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <PageMeta
        title="Sign In — The Storm Watcher"
        description="Sign in or create an account to access advanced space weather alerts and aurora forecasting."
        path="/auth"
        noindex
      />
      <div className="magnetic-orb" style={{ top: '-80px', right: '-120px' }} />
      <div className="solar-orb" style={{ bottom: '-100px', left: '-100px' }} />

      <div className="max-w-md w-full relative z-10">
        <div className="glass-surface rounded-3xl p-5 sm:p-6 md:p-8 border border-white/10">
          <div className="text-center mb-5 sm:mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#f97316] to-[#fbbf24] rounded-full mb-3 sm:mb-4 glow-orange">
              <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-white font-bold leading-tight text-[clamp(1.25rem,4.8vw,2rem)]">{title}</h1>
          </div>

          {mode !== 'forgot' && (
            <>
              <div className="grid grid-cols-2 mb-5 sm:mb-6 bg-white/5 rounded-xl p-1 sm:p-1.5 min-h-[40px] sm:min-h-[46px] gap-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className={`min-w-0 flex items-center justify-center py-2 px-2 sm:px-3 text-[clamp(0.72rem,2.7vw,0.92rem)] sm:text-sm leading-none font-semibold rounded-lg transition-all whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white shadow-lg'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {t('auth.signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className={`min-w-0 flex items-center justify-center py-2 px-2 sm:px-3 text-[clamp(0.72rem,2.7vw,0.92rem)] sm:text-sm leading-none font-semibold rounded-lg transition-all whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white shadow-lg'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {t('auth.signUp')}
                </button>
              </div>

              {/* OAuth buttons — hidden until providers are configured in Supabase
              <div className="space-y-2 mb-5">
                ...
              </div>
              <div className="flex items-center gap-3 mb-5">
                ...
              </div>
              */}
            </>
          )}

          <p className="text-[#94a3b8] text-center text-sm mb-6">{description}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('auth.fullName')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#475569]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316]/50 transition"
                    placeholder={t('auth.fullNamePlaceholder')}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#475569]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316]/50 transition"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[#94a3b8]">{t('auth.password')}</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setPassword(''); }}
                      className="text-xs text-[#f97316] hover:text-[#fbbf24] transition"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#475569]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316]/50 transition"
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    minLength={8}
                  />
                </div>
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
              className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#fbbf24] hover:from-[#ea580c] hover:to-[#f59e0b] text-white font-bold uppercase tracking-wider rounded-xl transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none glow-orange"
            >
              {loading
                ? t('auth.loading')
                : mode === 'forgot' ? t('auth.sendResetLink')
                : mode === 'signup' ? t('auth.signUp')
                : t('auth.signIn')}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="w-full text-center text-sm text-[#94a3b8] hover:text-white transition inline-flex items-center justify-center gap-2"
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
