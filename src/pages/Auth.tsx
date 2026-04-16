import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, Lock, User } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, signOut } = useAuth();
  const { t } = useLanguage();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        setError(error.message);
      } else if (!isLogin) {
        await signOut();
        setConfirmationSent(true);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#f97316] to-[#fbbf24] rounded-full mb-6">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Провери имейла си</h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Изпратихме линк за потвърждение на <span className="text-white font-medium">{email}</span>. Кликни върху него за да активираш профила си.
            </p>
            <p className="text-slate-500 text-sm">
              Не виждаш имейла? Провери папката Spam.
            </p>
            <button
              onClick={() => { setConfirmationSent(false); setIsLogin(true); }}
              className="mt-6 text-[#f97316] hover:text-[#fbbf24] text-sm font-medium transition"
            >
              Обратно към вход
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-white font-bold leading-tight text-[clamp(1.25rem,4.8vw,2rem)]">
              {isLogin ? t('auth.signIn') : t('auth.signUp')}
            </h1>
          </div>

          <div className="grid grid-cols-2 mb-5 sm:mb-6 bg-slate-700/40 rounded-lg p-1 sm:p-1.5 min-h-[40px] sm:min-h-[46px] gap-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`min-w-0 flex items-center justify-center py-2 px-2 sm:px-3 text-[clamp(0.72rem,2.7vw,0.92rem)] sm:text-sm leading-none font-semibold rounded-md border transition-all whitespace-nowrap ${
                isLogin
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/40 shadow-lg'
                  : 'text-slate-200 border-slate-500/40 hover:text-white hover:border-slate-400/60'
              }`}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`min-w-0 flex items-center justify-center py-2 px-2 sm:px-3 text-[clamp(0.72rem,2.7vw,0.92rem)] sm:text-sm leading-none font-semibold rounded-md border transition-all whitespace-nowrap ${
                !isLogin
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/40 shadow-lg'
                  : 'text-slate-200 border-slate-500/40 hover:text-white hover:border-slate-400/60'
              }`}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <p className="text-slate-400 text-center text-sm mb-6">
            {isLogin ? t('auth.signInDescription') : t('auth.signUpDescription')}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('auth.fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('auth.fullNamePlaceholder')}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.email')}
              </label>
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? t('auth.loading') : isLogin ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
