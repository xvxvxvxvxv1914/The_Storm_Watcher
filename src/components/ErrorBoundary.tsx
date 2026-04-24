import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4">
        <div className="glass-surface rounded-2xl p-8 max-w-md w-full text-center border border-[#ef4444]/20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ef4444]/10 mb-5">
            <AlertTriangle className="w-8 h-8 text-[#ef4444]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-[#94a3b8] text-sm mb-6 leading-relaxed">
            This page failed to load. Try again, or navigate elsewhere.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold hover:shadow-lg hover:shadow-[#f97316]/40 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-white/20 text-[#94a3b8] hover:text-white hover:border-white/40 transition-colors"
            >
              Go home
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 p-3 rounded-lg bg-black/40 text-left text-xs text-[#ef4444] overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
