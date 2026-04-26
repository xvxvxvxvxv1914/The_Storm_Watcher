import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PlanGuard from './PlanGuard';
import { AnimatedPage } from './AnimatedPage';

const Home = lazy(() => import('../pages/Home'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Forecast = lazy(() => import('../pages/Forecast'));
const Aurora = lazy(() => import('../pages/Aurora'));
const Alerts = lazy(() => import('../pages/Alerts'));
const Mood = lazy(() => import('../pages/Mood'));
const Auth = lazy(() => import('../pages/Auth'));
const UV = lazy(() => import('../pages/UV'));
const SunTimes = lazy(() => import('../pages/SunTimes'));
const SkyVisibility = lazy(() => import('../pages/SkyVisibility'));
const ISS = lazy(() => import('../pages/ISS'));
const AuthReset = lazy(() => import('../pages/AuthReset'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));

export const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
        <Route path="/auth" element={user && user.email_confirmed_at ? <Navigate to="/dashboard" replace /> : <AnimatedPage><Auth /></AnimatedPage>} />
        <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
        <Route path="/forecast" element={<AnimatedPage><Forecast /></AnimatedPage>} />
        <Route path="/aurora" element={<PlanGuard requiredPlan="pro"><AnimatedPage><Aurora /></AnimatedPage></PlanGuard>} />
        <Route path="/alerts" element={<PlanGuard requiredPlan="pro"><AnimatedPage><Alerts /></AnimatedPage></PlanGuard>} />
        <Route path="/mood" element={<AnimatedPage><Mood /></AnimatedPage>} />
        <Route path="/uv" element={<AnimatedPage><UV /></AnimatedPage>} />
        <Route path="/sun" element={<AnimatedPage><SunTimes /></AnimatedPage>} />
        <Route path="/sky" element={<AnimatedPage><SkyVisibility /></AnimatedPage>} />
        <Route path="/iss" element={<AnimatedPage><ISS /></AnimatedPage>} />
        <Route path="/auth/reset" element={<AnimatedPage><AuthReset /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
        <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
        <Route path="/pricing" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};
