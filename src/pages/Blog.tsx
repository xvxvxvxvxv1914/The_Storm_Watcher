import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { blogPosts, CATEGORY_LABELS } from '../data/blog';
import PageMeta from '../components/PageMeta';
import { AnimatedPage } from '../components/AnimatedPage';

const CATEGORY_COLORS: Record<string, { badge: string; bar: string }> = {
  'space-weather': { badge: 'text-blue-400 bg-blue-400/10', bar: 'bg-blue-500' },
  'aurora':        { badge: 'text-emerald-400 bg-emerald-400/10', bar: 'bg-emerald-500' },
  'solar':         { badge: 'text-orange-400 bg-orange-400/10', bar: 'bg-orange-500' },
  'guide':         { badge: 'text-purple-400 bg-purple-400/10', bar: 'bg-purple-500' },
};

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'space-weather', label: 'Space Weather' },
  { key: 'aurora', label: 'Aurora' },
  { key: 'solar', label: 'Solar' },
  { key: 'guide', label: 'Guides' },
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? blogPosts
    : blogPosts.filter(p => p.category === activeCategory);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <AnimatedPage>
      <PageMeta
        title="Space Weather Blog — The Storm Watcher"
        description="Learn about the Kp index, geomagnetic storms, aurora forecasts, solar flares, and space weather. Expert guides for aurora hunters and space weather enthusiasts."
        path="/blog"
      />
      <div className="min-h-screen bg-[#0a0a1a] px-4 py-8">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-1">Space Weather Blog</h1>
            <p className="text-slate-400 text-sm">Guides, explainers, and forecasting tips for aurora hunters.</p>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap mb-7">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.key
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/8 text-slate-400 hover:bg-white/12 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-12">No articles in this category yet.</p>
          )}

          {/* Featured post */}
          {featured && (
            <Link
              to={`/blog/${featured.slug}`}
              className="block mb-5 bg-white/6 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/8 transition-all group"
            >
              <div className={`h-1 w-full ${CATEGORY_COLORS[featured.category].bar}`} />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Featured</span>
                      <span className="text-slate-600">·</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[featured.category].badge}`}>
                        {CATEGORY_LABELS[featured.category]}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Clock size={10} />
                        {featured.readingTime} min
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-snug mb-2 group-hover:text-emerald-400 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{featured.description}</p>
                  </div>
                  <div className="text-5xl flex-shrink-0 mt-1">{featured.coverEmoji}</div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                  Read article <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rest.map(post => {
                const colors = CATEGORY_COLORS[post.category];
                return (
                  <Link
                    key={post.slug}
                    to={`/blog/${post.slug}`}
                    className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/8 hover:border-white/20 transition-all group"
                  >
                    <div className={`h-0.5 w-full ${colors.bar}`} />
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {CATEGORY_LABELS[post.category]}
                          </span>
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <Clock size={10} />
                            {post.readingTime} min
                          </span>
                        </div>
                        <span className="text-2xl flex-shrink-0">{post.coverEmoji}</span>
                      </div>
                      <h2 className="text-sm font-semibold text-white leading-snug group-hover:text-emerald-400 transition-colors flex-1">
                        {post.title}
                      </h2>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
