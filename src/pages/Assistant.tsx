import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Bot, Sparkles } from 'lucide-react';
import { getKpIndex, getSolarWind, getMagField, getXrayFlux, getXrayClass } from '../services/noaaApi';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SpaceWeatherContext {
  kp: number | null;
  windSpeed: number | null;
  bz: number | null;
  xrayClass: string | null;
  timestamp: string;
}

const SESSION_LIMIT = 10;
const SESSION_KEY = 'asst_count';

const PRESETS = [
  'Will there be a geomagnetic storm today?',
  'What is the Kp index and what does it mean?',
  'When is the best time to see the aurora?',
  'How does solar wind affect aurora visibility?',
];

const Assistant = () => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<SpaceWeatherContext>({
    kp: null, windSpeed: null, bz: null, xrayClass: null,
    timestamp: new Date().toUTCString(),
  });
  const [msgCount, setMsgCount] = useState(() => {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v ? parseInt(v, 10) : 0;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.allSettled([getKpIndex(), getSolarWind(), getMagField(), getXrayFlux()]).then(
      ([kpR, windR, magR, xrayR]) => {
        const kpArr = kpR.status === 'fulfilled' ? kpR.value : [];
        const windArr = windR.status === 'fulfilled' ? windR.value : [];
        const magArr = magR.status === 'fulfilled' ? magR.value : [];
        const xrayArr = xrayR.status === 'fulfilled' ? xrayR.value : [];

        const kp = kpArr.length ? kpArr[kpArr.length - 1].kp_index : null;
        const windSpeed = windArr.length ? windArr[windArr.length - 1].proton_speed : null;
        const bz = magArr.length ? magArr[magArr.length - 1].bz_gsm : null;
        const xrayFlux = xrayArr.length ? xrayArr[xrayArr.length - 1].flux : null;
        const xrayClass = xrayFlux !== null ? getXrayClass(xrayFlux) : null;

        setContext({ kp, windSpeed, bz, xrayClass, timestamp: new Date().toUTCString() });
      }
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || msgCount >= SESSION_LIMIT) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const newCount = msgCount + 1;
    setMsgCount(newCount);
    sessionStorage.setItem(SESSION_KEY, String(newCount));

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Sorry, I could not get a response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const remaining = SESSION_LIMIT - msgCount;
  const atLimit = msgCount >= SESSION_LIMIT;

  return (
    <div className="min-h-screen pt-20 pb-0 flex flex-col">
      <Helmet>
        <title>Space Weather Assistant — The Storm Watcher</title>
        <meta name="description" content="Ask anything about space weather, Kp index, aurora visibility, and geomagnetic storms. Powered by Claude AI with live data." />
        <link rel="canonical" href="https://thestormwatcher.com/assistant" />
        <meta property="og:title" content="Space Weather Assistant — The Storm Watcher" />
        <meta property="og:url" content="https://thestormwatcher.com/assistant" />
      </Helmet>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 flex flex-col flex-1" style={{ minHeight: 'calc(100vh - 80px)' }}>

        {/* Header */}
        <div className="pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                {t('assistant.title')}
              </h1>
              <p className="text-[#64748b] text-xs">{t('assistant.subtitle')}</p>
            </div>
          </div>
          {context.kp !== null && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#94a3b8]">
                Kp {context.kp.toFixed(1)}
              </span>
              {context.windSpeed !== null && (
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#94a3b8]">
                  Wind {Math.round(context.windSpeed)} km/s
                </span>
              )}
              {context.bz !== null && (
                <span className={`px-2.5 py-1 rounded-full border text-xs ${
                  context.bz < -10 ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' :
                  context.bz < 0 ? 'bg-white/5 border-white/10 text-[#94a3b8]' :
                  'bg-white/5 border-white/10 text-[#64748b]'
                }`}>
                  Bz {context.bz.toFixed(1)} nT
                </span>
              )}
              {context.xrayClass && (
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#94a3b8]">
                  X-ray {context.xrayClass}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="py-8">
              <div className="flex items-center gap-2 text-[#64748b] text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                {t('assistant.suggestions')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-[#94a3b8] text-sm hover:border-[#a78bfa]/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#f97316] text-white rounded-tr-sm'
                  : 'glass-surface border border-white/10 text-[#e2e8f0] rounded-tl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center mr-2 shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="glass-surface border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 pb-6 pt-2 border-t border-white/10">
          {atLimit ? (
            <p className="text-center text-[#64748b] text-sm py-3">{t('assistant.limitReached')}</p>
          ) : (
            <>
              <form
                onSubmit={e => { e.preventDefault(); send(input); }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={t('assistant.placeholder')}
                  disabled={loading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#a78bfa]/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
              <p className="text-center text-[#475569] text-xs mt-2">
                {remaining} {t('assistant.messagesLeft')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Assistant;
