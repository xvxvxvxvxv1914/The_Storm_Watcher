import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/aurora" element={<Aurora />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route
          path="/mood"
          element={
            <ProtectedRoute>
              <Mood />
            </ProtectedRoute>
          }
        />
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
      </AuthProvider>
    </Router>
  );
}

export default App;
