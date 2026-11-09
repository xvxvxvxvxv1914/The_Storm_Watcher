import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { supabase } from '../lib/supabase';
import StarField from '../components/StarField';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../utils/logger';

// Break points after "@" and before the TLD so narrow cards wrap the address
// at natural boundaries instead of mid-word.
const WrappableEmail = ({ email }: { email: string }) => {
  const [local, domain] = email.split('@');
  const dot = domain.lastIndexOf('.');
  return (
    <>
      {local}@<wbr />{domain.slice(0, dot)}<wbr />{domain.slice(dot)}
    </>
  );
};

const CATEGORIES = [
  { value: 'general',     labelKey: 'contact.topic.general' },
  { value: 'bug',         labelKey: 'contact.topic.bug' },
  { value: 'partnership', labelKey: 'contact.topic.partnership' },
  { value: 'support',     labelKey: 'contact.topic.support' },
];

// Upper bounds mirror the DB-side CHECK constraint on contact_messages.
// Keep in sync with the migration that enforces the same limits server-side.
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

const Contact = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState(user?.email ?? '');
  const [category, setCategory] = useState('general');
  const [message, setMessage]   = useState('');
  // Honeypot: a real user never sees or fills this. A bot that auto-fills every
  // field trips it, and we silently fake success without touching the DB.
  const [website, setWebsite]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Bot tripped the honeypot — pretend it worked, insert nothing.
    if (website) {
      setDone(true);
      setSubmitting(false);
      return;
    }

    const { error: dbError } = await supabase.from('contact_messages').insert({
      name: name.trim().slice(0, MAX_NAME),
      email: email.trim().slice(0, MAX_EMAIL),
      category,
      message: message.trim().slice(0, MAX_MESSAGE),
      user_id: user?.id ?? null,
    });

    if (dbError) {
      logError('Contact form submit failed', dbError);
      setError(t('contact.error'));
    } else {
      setDone(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <StarField />
      <PageMeta
        title="Contact — The Storm Watcher"
        description="Get in touch with The Storm Watcher team. Report bugs, ask questions, or explore partnership opportunities."
        path="/contact"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 uppercase tracking-tight">
            <span className="gradient-emerald">{t('footer.contact')}</span>
          </h1>
          <p className="text-[#94a3b8] text-lg">
            {t('contact.intro')}
          </p>
        </div>

        {done ? (
          <div className="glass-surface rounded-3xl p-10 text-center border border-[#10b981]/30">
            <CheckCircle className="w-16 h-16 text-[#10b981] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{t('contact.sent')}</h2>
            <p className="text-[#94a3b8]">
              {t('contact.reply').replace('{email}', () => email)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-surface rounded-3xl p-6 sm:p-10 border border-white/10 space-y-6">

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                  {t('contact.name')}
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  maxLength={MAX_NAME}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('profile.displayNamePlaceholder')}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                  {t('auth.email')}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={MAX_EMAIL}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors"
                />
              </div>
            </div>

            {/* Category */}
            <fieldset>
              <legend className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                {t('contact.topic')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={category === c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      category === c.value
                        ? 'bg-[#10b981] border-[#10b981] text-white'
                        : 'bg-white/5 border-white/10 text-[#94a3b8] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {t(c.labelKey)}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Message */}
            <div>
              <label htmlFor="contact-message" className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                {t('contact.message')}
              </label>
              <textarea
                id="contact-message"
                required
                rows={6}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('contact.messagePlaceholder')}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors resize-none"
              />
            </div>

            {/* Honeypot — visually hidden, off-screen, excluded from tab order and
                a11y tree. Real users never touch it; bots that fill every field do. */}
            <div aria-hidden="true" className="absolute w-px h-px -left-[9999px] overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={e => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-[#ef4444] text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[#10b981] to-[#059669]"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('contact.send')}
                </>
              )}
            </button>

            <p className="text-center text-[#475569] text-xs">
              {t('contact.emailUs')}{' '}
              <a href="mailto:contact@thestormwatcher.com" className="text-[#94a3b8] hover:text-white transition-colors">
                contact@thestormwatcher.com
              </a>
            </p>
          </form>
        )}

        {/* Contact cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Mail, labelKey: 'contact.general', email: 'contact@thestormwatcher.com', color: '#10b981' },
            { icon: Mail, labelKey: 'footer.support', email: 'support@thestormwatcher.com', color: '#a78bfa' },
            { icon: Mail, labelKey: 'contact.partners', email: 'partnerships@thestormwatcher.com', color: '#f97316' },
          ].map(item => (
            <a
              key={item.email}
              href={`mailto:${item.email}`}
              className="glass-surface rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors flex items-center gap-3"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: item.color }} />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider">{t(item.labelKey)}</div>
                <div className="text-xs text-[#94a3b8] break-words">
                  <WrappableEmail email={item.email} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Contact;
