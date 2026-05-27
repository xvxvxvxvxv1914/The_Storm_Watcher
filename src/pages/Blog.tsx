import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import { blogPosts, CATEGORY_LABELS } from '../data/blog';
import PageMeta from '../components/PageMeta';
import { AnimatedPage } from '../components/AnimatedPage';

const CATEGORY_COLORS: Record<string, string> = {
  'space-weather': 'text-blue-400 bg-blue-400/10',
  'aurora': 'text-emerald-400 bg-emerald-400/10',
  'solar': 'text-orange-400 bg-orange-400/10',
  'guide': 'text-purple-400 bg-purple-400/10',
};

export default function Blog() {
  return (
    <AnimatedPage>
      <PageMeta
        title="Space Weather Blog — The Storm Watcher"
        description="Learn about the Kp index, geomagnetic storms, aurora forecasts, solar flares, and space weather. Expert guides for aurora hunters and space weather enthusiasts."
        path="/blog"
      />
      <div className="min-h-screen bg-[#0a0a1a] px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Space Weather Blog</h1>
            <p className="text-slate-400">Guides, explainers, and forecasting tips for aurora hunters.</p>
          </div>

          <div className="space-y-4">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0 mt-0.5">{post.coverEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category]}`}>
                        {CATEGORY_LABELS[post.category]}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Clock size={11} />
                        {post.readingTime} min read
                      </span>
                    </div>
                    <h2 className="text-white font-semibold text-base leading-snug mb-1 group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{post.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
