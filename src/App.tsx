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
import Auth from './pages/Auth';
import UV from './pages/UV';
import SunTimes from './pages/SunTimes';
import SkyVisibility from './pages/SkyVisibility';
import ISS from './pages/ISS';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={user && user.email_confirmed_at ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/aurora" element={<Aurora />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="/uv" element={<UV />} />
        <Route path="/sun" element={<SunTimes />} />
        <Route path="/sky" element={<SkyVisibility />} />
        <Route path="/iss" element={<ISS />} />
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
