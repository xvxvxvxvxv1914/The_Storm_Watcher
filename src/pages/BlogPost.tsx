import { useParams, Link, Navigate } from 'react-router-dom';
import { Clock, ArrowLeft, Info, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';
import { getBlogPost, getLocalizedBlogPost, getLocalizedBlogList, CATEGORY_LABELS } from '../data/blog';
import type { BlogSection } from '../data/blog/types';
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

const CALLOUT_STYLES = {
  info:    { icon: Info,          border: 'border-blue-500/30',    bg: 'bg-blue-500/10',    text: 'text-blue-200',    icon_color: 'text-blue-400' },
  warning: { icon: AlertTriangle, border: 'border-orange-500/30',  bg: 'bg-orange-500/10',  text: 'text-orange-200',  icon_color: 'text-orange-400' },
  tip:     { icon: Lightbulb,     border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-200', icon_color: 'text-emerald-400' },
};

function Section({ section }: { section: BlogSection }) {
  switch (section.type) {
    case 'paragraph':
      return <p className="text-[#94a3b8] leading-relaxed text-[15px]">{section.text}</p>;

    case 'heading':
      return section.level === 2
        ? (
          <h2 className="flex items-center gap-3 text-xl font-bold text-white mt-8 mb-3">
            <span className="w-1 h-6 rounded-full bg-emerald-400 flex-shrink-0" />
            {section.text}
          </h2>
        )
        : <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-2">{section.text}</h3>;

    case 'list':
      return (
        <ul className="space-y-2">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[#94a3b8] text-[15px]">
              <span className="text-emerald-400 mt-1 flex-shrink-0 text-[10px]">◆</span>
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
        <div className={`flex gap-3 p-4 rounded-2xl border ${style.border} ${style.bg}`}>
          <Icon size={17} className={`${style.icon_color} flex-shrink-0 mt-0.5`} />
          <p className={`text-sm leading-relaxed ${style.text}`}>{section.text}</p>
        </div>
      );
    }

    default:
      return null;
  }
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const post = getLocalizedBlogPost(slug ?? '', language);

  if (!post) return <Navigate to="/blog" replace />;

  // A language variant without a real translation renders the English body, so
  // it must canonicalize to the English URL (mirrors scripts/prerender-meta.mjs).
  const hasOwnTranslation =
    language === 'en' || Boolean(getBlogPost(post.slug)?.translations?.[language]);

  const cat = CATEGORY_CONFIG[post.category] ?? CATEGORY_CONFIG['guide'];
  const otherPosts = getLocalizedBlogList(language).filter((p) => p.slug !== post.slug).slice(0, 3);

  const ogImage = `https://www.thestormwatcher.com/api/og?type=blog&title=${encodeURIComponent(post.title)}&emoji=${encodeURIComponent(post.coverEmoji)}&category=${post.category}`;

  return (
    <AnimatedPage>
      <PageMeta
        title={`${post.title} — The Storm Watcher`}
        description={post.description}
        path={`/blog/${post.slug}`}
        canonicalPath={hasOwnTranslation ? undefined : `/blog/${post.slug}`}
        image={ogImage}
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
          "publisher": { "@type": "Organization", "name": "The Storm Watcher", "logo": { "@type": "ImageObject", "url": "https://www.thestormwatcher.com/og-image.png" } },
          "mainEntityOfPage": { "@type": "WebPage", "@id": `https://www.thestormwatcher.com/blog/${post.slug}` },
          "image": "https://www.thestormwatcher.com/og-image.png"
        })}</script>
      </PageMeta>
      <BreadcrumbSchema crumbs={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }]} />

      <div className="min-h-screen relative overflow-hidden pt-20 pb-24 px-4" style={{ background: isDark ? 'transparent' : '#eef2f8' }}>
        <StarField />
        <div className="solar-orb" style={{ top: '-10%', right: '-5%', opacity: 0.2 }} />
        <div className="magnetic-orb" style={{ bottom: '15%', left: '-8%', opacity: 0.15 }} />

        <div className="relative z-10 max-w-2xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-[#475569] hover:text-emerald-400 transition-colors mb-8 text-sm"
          >
            <ArrowLeft size={15} />
            All articles
          </Link>

          <header className="mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-5"
              style={{ background: `${cat.glow}18`, border: `1px solid ${cat.glow}30` }}
            >
              {post.coverEmoji}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cat.text} ${cat.bg} ${cat.border}`}>
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="text-[#475569] text-xs flex items-center gap-1">
                <Clock size={11} />
                {post.readingTime} min read
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">{post.title}</h1>
            <p className="text-[#64748b] leading-relaxed">{post.description}</p>
          </header>

          <div className="space-y-4">
            {post.content.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </div>

          <div className="mt-12">
            <Link
              to="/"
              className="block rounded-2xl p-6 text-center border border-emerald-500/25 hover:border-emerald-500/40 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #10b98110 0%, #05966908 100%)' }}
            >
              <p className="text-emerald-400 font-semibold mb-1">Track Space Weather Live</p>
              <p className="text-[#64748b] text-sm">Real-time Kp index, aurora forecasts, and storm alerts.</p>
            </Link>
          </div>

          {otherPosts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-white font-semibold mb-4 text-base">More Articles</h2>
              <div className="space-y-3">
                {otherPosts.map((p) => {
                  const pCat = CATEGORY_CONFIG[p.category] ?? CATEGORY_CONFIG['guide'];
                  return (
                    <Link
                      key={p.slug}
                      to={`/blog/${p.slug}`}
                      className="glass-surface flex items-center gap-3 p-4 rounded-2xl border border-white/8 hover:border-white/20 transition-all duration-200 group"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: `${pCat.glow}18`, border: `1px solid ${pCat.glow}28` }}
                      >
                        {p.coverEmoji}
                      </div>
                      <span className="text-[#94a3b8] text-sm group-hover:text-white transition-colors leading-snug flex-1">{p.title}</span>
                      <ChevronRight size={15} className="text-[#334155] group-hover:text-emerald-400 transition-colors flex-shrink-0" />
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
