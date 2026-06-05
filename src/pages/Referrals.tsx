import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Copy, Check, Share2, Users, Sparkles, BadgeCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePaymentGate } from '../hooks/usePaymentGate';
import { supabase } from '../lib/supabase';
import PageMeta from '../components/PageMeta';

const SITE = 'https://www.thestormwatcher.com';

export default function Referrals() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { referralProUntil } = usePaymentGate();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ invited: number; subscribed: number; days: number } | null>(null);

  const code = profile?.referral_code ?? null;
  const link = code ? `${SITE}/?ref=${code}` : '';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('referrals')
        .select('status, reward_days')
        .eq('referrer_id', user.id);
      if (cancelled || !data) return;
      const subscribed = data.filter(r => r.status === 'rewarded');
      setStats({
        invited: data.length,
        subscribed: subscribed.length,
        days: subscribed.reduce((sum, r) => sum + (r.reward_days ?? 30), 0),
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — user can select manually */ }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'The Storm Watcher', url: link }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  };

  const proUntilDate = referralProUntil
    ? new Date(referralProUntil).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="min-h-screen text-white pt-20 pb-24" style={{ background: 'var(--tsw-bg)' }}>
      <PageMeta title={`${t('referrals.title')} — The Storm Watcher`} description={t('referrals.subtitle')} path="/referrals" />

      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20">
            <Gift className="w-5 h-5 text-[#10b981]" />
          </div>
          <h1 className="text-2xl font-bold">{t('referrals.title')}</h1>
        </div>
        <p className="text-[#64748b] text-sm mb-8 ml-14">{t('referrals.subtitle')}</p>

        {!user ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-[#94a3b8] mb-4">{t('referrals.signInPrompt')}</p>
            <Link to="/auth" className="inline-block px-5 py-2.5 rounded-xl bg-[#10b981] text-white text-sm font-semibold hover:bg-[#0d9a6f] transition-colors">
              {t('referrals.signIn')}
            </Link>
          </div>
        ) : (
          <>
            {/* Referral link */}
            <div className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-5 mb-6">
              <div className="text-xs uppercase tracking-wider text-[#64748b] font-semibold mb-2">{t('referrals.yourLink')}</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={link}
                  onFocus={e => e.target.select()}
                  className="flex-1 min-w-0 rounded-xl bg-[var(--tsw-surface-bg)] border border-white/10 px-3 py-2.5 text-sm text-[var(--tsw-fg-muted)] font-mono"
                />
                <div className="flex gap-2">
                  <button onClick={copy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold transition-colors">
                    {copied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                    {copied ? t('referrals.copied') : t('referrals.copy')}
                  </button>
                  <button onClick={share} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#10b981] text-white text-sm font-semibold hover:bg-[#0d9a6f] transition-colors">
                    <Share2 className="w-4 h-4" />
                    {t('referrals.share')}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <Stat icon={<Users className="w-4 h-4" />} value={stats?.invited ?? 0} label={t('referrals.invited')} />
              <Stat icon={<BadgeCheck className="w-4 h-4" />} value={stats?.subscribed ?? 0} label={t('referrals.subscribed')} />
              <Stat icon={<Sparkles className="w-4 h-4" />} value={stats?.days ?? 0} label={t('referrals.proEarned')} />
            </div>

            {proUntilDate && (
              <div className="rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-3 mb-8 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-[#10b981] flex-shrink-0" />
                <span className="text-[#cbd5e1]">{t('referrals.proActiveUntil')} <strong className="text-white">{proUntilDate}</strong></span>
              </div>
            )}

            {/* How it works */}
            <h2 className="text-xs uppercase tracking-wider text-[#475569] font-semibold mb-3">{t('referrals.how')}</h2>
            <ol className="space-y-3">
              {[t('referrals.step1'), t('referrals.step2'), t('referrals.step3')].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10b981]/15 text-[#10b981] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-[#94a3b8] pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-4 text-center">
      <div className="flex justify-center text-[#10b981] mb-1.5">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-[#64748b] mt-0.5 leading-tight">{label}</div>
    </div>
  );
}
