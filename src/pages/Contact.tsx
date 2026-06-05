import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../utils/logger';

const CATEGORIES = [
  { value: 'general',     label: 'General question' },
  { value: 'bug',         label: 'Bug report' },
  { value: 'partnership', label: 'Partnership / press' },
  { value: 'support',     label: 'Account support' },
];

const Contact = () => {
  const { user } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState(user?.email ?? '');
  const [category, setCategory] = useState('general');
  const [message, setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: dbError } = await supabase.from('contact_messages').insert({
      name: name.trim(),
      email: email.trim(),
      category,
      message: message.trim(),
      user_id: user?.id ?? null,
    });

    if (dbError) {
      logError('Contact form submit failed', dbError);
      setError('Something went wrong. Please try emailing us directly at contact@thestormwatcher.com');
    } else {
      setDone(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-20 pb-16">
      <PageMeta
        title="Contact — The Storm Watcher"
        description="Get in touch with The Storm Watcher team. Report bugs, ask questions, or explore partnership opportunities."
        path="/contact"
      />
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 uppercase tracking-tight">
            Get in <span className="gradient-emerald">Touch</span>
          </h1>
          <p className="text-[#94a3b8] text-lg">
            Questions, bug reports, or partnership ideas — we read every message.
          </p>
        </div>

        {done ? (
          <div className="glass-surface rounded-3xl p-10 text-center border border-[#10b981]/30">
            <CheckCircle className="w-16 h-16 text-[#10b981] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Message sent!</h2>
            <p className="text-[#94a3b8]">
              We'll get back to you at <span className="text-white">{email}</span> as soon as possible.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-surface rounded-3xl p-6 sm:p-10 border border-white/10 space-y-6">

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                Topic
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    style={
                      category === c.value
                        ? { background: '#10b981', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                Message
              </label>
              <textarea
                required
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-[#475569] focus:outline-none focus:border-[#10b981]/60 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-[#ef4444] text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send message
                </>
              )}
            </button>

            <p className="text-center text-[#475569] text-xs">
              Or email us directly at{' '}
              <a href="mailto:contact@thestormwatcher.com" className="text-[#94a3b8] hover:text-white transition-colors">
                contact@thestormwatcher.com
              </a>
            </p>
          </form>
        )}

        {/* Contact cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Mail, label: 'General', email: 'contact@thestormwatcher.com', color: '#10b981' },
            { icon: Mail, label: 'Support', email: 'support@thestormwatcher.com', color: '#a78bfa' },
            { icon: Mail, label: 'Partners', email: 'partnerships@thestormwatcher.com', color: '#f97316' },
          ].map(item => (
            <a
              key={item.email}
              href={`mailto:${item.email}`}
              className="glass-surface rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors flex items-center gap-3"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: item.color }} />
              <div>
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider">{item.label}</div>
                <div className="text-xs text-[#94a3b8] break-all">{item.email}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Contact;
