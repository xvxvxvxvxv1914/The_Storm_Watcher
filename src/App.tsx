import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Lock, X } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import Aurora from './pages/Aurora';
import Alerts from './pages/Alerts';
import Mood from './pages/Mood';
import Pricing from './pages/Pricing';
import Auth from './pages/Auth';

function PaidModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-surface rounded-2xl p-8 max-w-md w-full border border-[#f97316]/30 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#fbbf24] rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Платена секция</h2>
          <p className="text-[#94a3b8] mb-8 leading-relaxed">
            Прогнозата е достъпна само за регистрирани потребители. Създай безплатен профил, за да я използваш.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              to="/auth"
              className="flex-1 py-3 px-6 bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white font-semibold rounded-lg text-center hover:shadow-lg hover:shadow-[#f97316]/50 transition-all"
            >
              Регистрирай се
            </Link>
            <Link
              to="/pricing"
              onClick={onClose}
              className="flex-1 py-3 px-6 glass-surface text-white font-semibold rounded-lg text-center border border-white/10 hover:border-[#f97316]/30 transition-all"
            >
              Вижи плановете
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = React.useState(!user && !loading);

  React.useEffect(() => {
    if (!loading && !user) setShowModal(true);
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen" />
        {showModal && <PaidModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={user && user.email_confirmed_at ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/forecast"
          element={
            <ProtectedRoute>
              <Forecast />
            </ProtectedRoute>
          }
        />
        <Route path="/aurora" element={<Aurora />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <SpeedInsights />
      </AuthProvider>
    </Router>
  );
}

export default App;
