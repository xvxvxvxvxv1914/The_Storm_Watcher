import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Clock, ArrowLeft, Info, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { getBlogPost, blogPosts, CATEGORY_LABELS } from '../data/blog';
import type { BlogSection } from '../data/blog/types';
import PageMeta from '../components/PageMeta';
import { AnimatedPage } from '../components/AnimatedPage';

const CATEGORY_COLORS: Record<string, { badge: string; bar: string }> = {
  'space-weather': { badge: 'text-blue-400 bg-blue-400/10', bar: 'bg-blue-500' },
  'aurora':        { badge: 'text-emerald-400 bg-emerald-400/10', bar: 'bg-emerald-500' },
  'solar':         { badge: 'text-orange-400 bg-orange-400/10', bar: 'bg-orange-500' },
  'guide':         { badge: 'text-purple-400 bg-purple-400/10', bar: 'bg-purple-500' },
};

const CALLOUT_STYLES = {
  info:    { icon: Info,          border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    text: 'text-blue-300',    icon_color: 'text-blue-400' },
  warning: { icon: AlertTriangle, border: 'border-orange-500/40',  bg: 'bg-orange-500/10',  text: 'text-orange-200',  icon_color: 'text-orange-400' },
  tip:     { icon: Lightbulb,     border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-200', icon_color: 'text-emerald-400' },
};

function Section({ section }: { section: BlogSection }) {
  switch (section.type) {
    case 'paragraph':
      return <p className="text-slate-300 leading-[1.8] text-[15px]">{section.text}</p>;

    case 'heading':
      return section.level === 2
        ? <h2 className="text-xl font-bold text-white mt-10 mb-4 border-l-2 border-emerald-500 pl-3">{section.text}</h2>
        : <h3 className="text-base font-semibold text-slate-100 mt-7 mb-2">{section.text}</h3>;

    case 'list':
      return (
        <ul className="space-y-2.5">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-300 text-[15px]">
              <span className="text-emerald-400 mt-1.5 flex-shrink-0 text-xs">▶</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'callout': {
      const variant = section.variant ?? 'info';
      const style = CALLOUT_STYLES[variant];
      const Icon = style.icon;
      return (
        <div className={`flex gap-3 p-4 rounded-xl border ${style.border} ${style.bg}`}>
          <Icon size={18} className={`${style.icon_color} flex-shrink-0 mt-0.5`} />
          <p className={`text-sm leading-relaxed ${style.text}`}>{section.text}</p>
        </div>
      );
    }

    default:
      return null;
  }
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-white/5">
      <div
        className="h-full bg-emerald-500 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug ?? '');

  if (!post) return <Navigate to="/blog" replace />;

  const otherPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const colors = CATEGORY_COLORS[post.category];

  return (
    <AnimatedPage>
      <PageMeta
        title={`${post.title} — The Storm Watcher`}
        description={post.description}
        path={`/blog/${post.slug}`}
      >
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.date} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.description,
          "datePublished": post.date,
          "author": { "@type": "Organization", "name": "The Storm Watcher", "url": "https://www.thestormwatcher.com" },
          "publisher": { "@type": "Organization", "name": "The Storm Watcher", "logo": { "@type": "ImageObject", "url": "https://www.thestormwatcher.com/og-image.webp" } },
          "mainEntityOfPage": { "@type": "WebPage", "@id": `https://www.thestormwatcher.com/blog/${post.slug}` },
          "image": "https://www.thestormwatcher.com/og-image.webp"
        })}</script>
      </PageMeta>

      <ReadingProgress />

      <div className="min-h-screen bg-[#0a0a1a] px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mb-8 text-sm"
          >
            <ArrowLeft size={15} />
            All articles
          </Link>

          {/* Article header */}
          <header className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <Clock size={10} />
                {post.readingTime} min read
              </span>
            </div>

            <div className="flex items-start gap-5">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white leading-tight mb-3">{post.title}</h1>
                <p className="text-slate-400 leading-relaxed text-sm">{post.description}</p>
              </div>
              <div className="text-5xl flex-shrink-0">{post.coverEmoji}</div>
            </div>

            <div className={`mt-6 h-px ${colors.bar} opacity-30`} />
          </header>

          {/* Article body */}
          <div className="space-y-5">
            {post.content.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 pt-8 border-t border-white/10">
            <Link
              to="/"
              className="block w-full bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-5 hover:bg-emerald-500/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-400 font-semibold mb-0.5">Track Space Weather Live</p>
                  <p className="text-slate-400 text-sm">Real-time Kp index, aurora forecasts, and storm alerts.</p>
                </div>
                <ArrowRight size={18} className="text-emerald-500 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* More articles */}
          {otherPosts.length > 0 && (
            <div className="mt-8 mb-6">
              <h2 className="text-white font-semibold mb-4">More Articles</h2>
              <div className="space-y-2">
                {otherPosts.map((p) => {
                  const c = CATEGORY_COLORS[p.category];
                  return (
                    <Link
                      key={p.slug}
                      to={`/blog/${p.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all group"
                    >
                      <span className="text-xl flex-shrink-0">{p.coverEmoji}</span>
                      <span className="text-slate-300 text-sm group-hover:text-white transition-colors leading-snug flex-1">{p.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block ${c.badge}`}>
                        {CATEGORY_LABELS[p.category]}
                      </span>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
