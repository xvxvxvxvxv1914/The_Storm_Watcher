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
const NotFound = lazy(() => import('../pages/NotFound'));
const FAQ = lazy(() => import('../pages/FAQ'));
const MagneticEffects = lazy(() => import('../pages/MagneticEffects'));
const Pricing = lazy(() => import('../pages/Pricing'));
const About = lazy(() => import('../pages/About'));
const Privacy = lazy(() => import('../pages/Privacy'));
const Terms = lazy(() => import('../pages/Terms'));
const Gallery = lazy(() => import('../pages/Gallery'));
const Hunt = lazy(() => import('../pages/Hunt'));
const Livestream = lazy(() => import('../pages/Livestream'));
const Calendar = lazy(() => import('../pages/Calendar'));
const LanguageSettings = lazy(() => import('../pages/LanguageSettings'));
const AuroraMap = lazy(() => import('../pages/AuroraMap'));
const Blog = lazy(() => import('../pages/Blog'));
const BlogPost = lazy(() => import('../pages/BlogPost'));

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
        <Route path="/aurora" element={<PlanGuard requiredPlan="pro" fullPage><AnimatedPage><Aurora /></AnimatedPage></PlanGuard>} />
        <Route path="/alerts" element={<PlanGuard requiredPlan="pro" fullPage><AnimatedPage><Alerts /></AnimatedPage></PlanGuard>} />
        <Route path="/mood" element={<AnimatedPage><Mood /></AnimatedPage>} />
        <Route path="/uv" element={<AnimatedPage><UV /></AnimatedPage>} />
        <Route path="/sun" element={<AnimatedPage><SunTimes /></AnimatedPage>} />
        <Route path="/sky" element={<AnimatedPage><SkyVisibility /></AnimatedPage>} />
        <Route path="/iss" element={<AnimatedPage><ISS /></AnimatedPage>} />
        <Route path="/auth/reset" element={<AnimatedPage><AuthReset /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
        <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
        <Route path="/settings/language" element={<AnimatedPage><LanguageSettings /></AnimatedPage>} />
        <Route path="/faq" element={<AnimatedPage><FAQ /></AnimatedPage>} />
        <Route path="/magnetic-effects" element={<AnimatedPage><MagneticEffects /></AnimatedPage>} />
        <Route path="/pricing" element={<AnimatedPage><Pricing /></AnimatedPage>} />
        <Route path="/about" element={<AnimatedPage><About /></AnimatedPage>} />
        <Route path="/privacy" element={<AnimatedPage><Privacy /></AnimatedPage>} />
        <Route path="/terms" element={<AnimatedPage><Terms /></AnimatedPage>} />
        <Route path="/gallery" element={<AnimatedPage><Gallery /></AnimatedPage>} />
        <Route path="/hunt" element={<AnimatedPage><Hunt /></AnimatedPage>} />
        <Route path="/livestream" element={<AnimatedPage><Livestream /></AnimatedPage>} />
        <Route path="/calendar" element={<AnimatedPage><Calendar /></AnimatedPage>} />
        <Route path="/aurora-map" element={<AnimatedPage><AuroraMap /></AnimatedPage>} />
        <Route path="/blog" element={<AnimatedPage><Blog /></AnimatedPage>} />
        <Route path="/blog/:slug" element={<AnimatedPage><BlogPost /></AnimatedPage>} />
        <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  );
};
