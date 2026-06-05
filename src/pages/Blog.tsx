import { Link } from 'react-router-dom';
import { Clock, ChevronRight, Rss } from 'lucide-react';
import { getLocalizedBlogList, CATEGORY_LABELS } from '../data/blog';
import PageMeta from '../components/PageMeta';
import BreadcrumbSchema from '../components/BreadcrumbSchema';
import { AnimatedPage } from '../components/AnimatedPage';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';
import { useTheme } from '../contexts/ThemeContext';

const CATEGORY_CONFIG: Record<string, { text: string; bg: string; glow: string; border: string }> = {
  'space-weather': { text: 'text-blue-300',   bg: 'bg-blue-500/10',    glow: '#3b82f6', border: 'border-blue-500/30' },
  'aurora':        { text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: '#10b981', border: 'border-emerald-500/30' },
  'solar':         { text: 'text-orange-300',  bg: 'bg-orange-500/10',  glow: '#f97316', border: 'border-orange-500/30' },
  'guide':         { text: 'text-purple-300',  bg: 'bg-purple-500/10',  glow: '#a855f7', border: 'border-purple-500/30' },
};

export default function Blog() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const posts = getLocalizedBlogList(language);

  return (
    <AnimatedPage>
      <PageMeta
        title="Space Weather Blog — The Storm Watcher"
        description="Learn about the Kp index, geomagnetic storms, aurora forecasts, solar flares, and space weather. Expert guides for aurora hunters and space weather enthusiasts."
        path="/blog"
      >
        <link rel="alternate" type="application/rss+xml" title="The Storm Watcher Blog" href="https://www.thestormwatcher.com/feed.xml" />
      </PageMeta>
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }]} />

      <div className="min-h-screen relative overflow-hidden pt-20 pb-24 px-4" style={{ background: isDark ? '#050510' : '#eef2f8' }}>
        <StarField />
        <div className="solar-orb" style={{ top: '-10%', right: '-5%', opacity: 0.25 }} />
        <div className="magnetic-orb" style={{ bottom: '10%', left: '-8%', opacity: 0.2 }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Hero */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <Rss size={13} className="text-emerald-400" />
                <span className="text-emerald-300 text-xs font-medium tracking-wide uppercase">Space Weather Blog</span>
              </div>
              <a
                href="/feed.xml"
                title="RSS Feed"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
              >
                <Rss size={12} className="text-orange-400" />
                <span className="text-orange-300 text-xs font-medium">RSS</span>
              </a>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
              Guides for{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Aurora Hunters
              </span>
            </h1>
            <p className="text-[#64748b] text-base max-w-lg mx-auto leading-relaxed">
              Kp index, geomagnetic storms, solar flares, and forecasting tips — everything you need to catch the lights.
            </p>
          </div>

          {/* Article list */}
          <div className="space-y-3">
            {posts.map((post) => {
              const cat = CATEGORY_CONFIG[post.category] ?? CATEGORY_CONFIG['guide'];
              return (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="glass-surface block rounded-2xl p-5 border border-white/8 hover:border-white/20 transition-all duration-200 group"
                  style={{ '--hover-glow': cat.glow } as React.CSSProperties}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="text-3xl flex-shrink-0 mt-0.5 w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${cat.glow}18`, border: `1px solid ${cat.glow}28` }}
                    >
                      {post.coverEmoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cat.text} ${cat.bg} ${cat.border}`}>
                          {CATEGORY_LABELS[post.category]}
                        </span>
                        <span className="text-[#475569] text-xs flex items-center gap-1">
                          <Clock size={11} />
                          {post.readingTime} min read
                        </span>
                      </div>
                      <h2 className="text-white font-semibold text-[15px] leading-snug mb-1 group-hover:text-emerald-400 transition-colors duration-200">
                        {post.title}
                      </h2>
                      <p className="text-[#64748b] text-sm leading-relaxed line-clamp-2">{post.description}</p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-[#334155] group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-2"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
