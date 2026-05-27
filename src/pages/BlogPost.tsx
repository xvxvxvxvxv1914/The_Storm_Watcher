import { useParams, Link, Navigate } from 'react-router-dom';
import { Clock, ArrowLeft, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { getBlogPost, blogPosts, CATEGORY_LABELS } from '../data/blog';
import type { BlogSection } from '../data/blog/types';
import PageMeta from '../components/PageMeta';
import { AnimatedPage } from '../components/AnimatedPage';

const CATEGORY_COLORS: Record<string, string> = {
  'space-weather': 'text-blue-400 bg-blue-400/10',
  'aurora': 'text-emerald-400 bg-emerald-400/10',
  'solar': 'text-orange-400 bg-orange-400/10',
  'guide': 'text-purple-400 bg-purple-400/10',
};

const CALLOUT_STYLES = {
  info: { icon: Info, border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-300', icon_color: 'text-blue-400' },
  warning: { icon: AlertTriangle, border: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-200', icon_color: 'text-orange-400' },
  tip: { icon: Lightbulb, border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-200', icon_color: 'text-emerald-400' },
};

function Section({ section }: { section: BlogSection }) {
  switch (section.type) {
    case 'paragraph':
      return <p className="text-slate-300 leading-relaxed">{section.text}</p>;

    case 'heading':
      return section.level === 2
        ? <h2 className="text-xl font-bold text-white mt-8 mb-3">{section.text}</h2>
        : <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-2">{section.text}</h3>;

    case 'list':
      return (
        <ul className="space-y-2">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-300">
              <span className="text-emerald-400 mt-1.5 flex-shrink-0">•</span>
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug ?? '');

  if (!post) return <Navigate to="/blog" replace />;

  const otherPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <AnimatedPage>
      <PageMeta
        title={`${post.title} — The Storm Watcher`}
        description={post.description}
        path={`/blog/${post.slug}`}
      />
      <div className="min-h-screen bg-[#0a0a1a] px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft size={16} />
            All articles
          </Link>

          <header className="mb-8">
            <div className="text-5xl mb-4">{post.coverEmoji}</div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category]}`}>
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <Clock size={11} />
                {post.readingTime} min read
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-3">{post.title}</h1>
            <p className="text-slate-400 leading-relaxed">{post.description}</p>
          </header>

          <div className="space-y-4">
            {post.content.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <Link
              to="/"
              className="block w-full bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-5 text-center hover:bg-emerald-500/20 transition-colors"
            >
              <p className="text-emerald-400 font-semibold mb-1">Track Space Weather Live</p>
              <p className="text-slate-400 text-sm">Real-time Kp index, aurora forecasts, and storm alerts.</p>
            </Link>
          </div>

          {otherPosts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-white font-semibold mb-4">More Articles</h2>
              <div className="space-y-3">
                {otherPosts.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all group"
                  >
                    <span className="text-xl">{p.coverEmoji}</span>
                    <span className="text-slate-300 text-sm group-hover:text-white transition-colors leading-snug">{p.title}</span>
                    <ArrowLeft size={14} className="text-slate-600 group-hover:text-emerald-400 rotate-180 ml-auto flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
