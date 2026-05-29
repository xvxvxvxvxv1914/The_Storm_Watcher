import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PlanGuard from './PlanGuard';
import { AnimatedPage } from './AnimatedPage';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const Home = lazyWithRetry(() => import('../pages/Home'));
const Dashboard = lazyWithRetry(() => import('../pages/Dashboard'));
const Forecast = lazyWithRetry(() => import('../pages/Forecast'));
const Aurora = lazyWithRetry(() => import('../pages/Aurora'));
const Alerts = lazyWithRetry(() => import('../pages/Alerts'));
const Mood = lazyWithRetry(() => import('../pages/Mood'));
const Auth = lazyWithRetry(() => import('../pages/Auth'));
const UV = lazyWithRetry(() => import('../pages/UV'));
const SunTimes = lazyWithRetry(() => import('../pages/SunTimes'));
const SkyVisibility = lazyWithRetry(() => import('../pages/SkyVisibility'));
const ISS = lazyWithRetry(() => import('../pages/ISS'));
const AuthReset = lazyWithRetry(() => import('../pages/AuthReset'));
const Profile = lazyWithRetry(() => import('../pages/Profile'));
const Settings = lazyWithRetry(() => import('../pages/Settings'));
const NotFound = lazyWithRetry(() => import('../pages/NotFound'));
const FAQ = lazyWithRetry(() => import('../pages/FAQ'));
const MagneticEffects = lazyWithRetry(() => import('../pages/MagneticEffects'));
const Pricing = lazyWithRetry(() => import('../pages/Pricing'));
const About = lazyWithRetry(() => import('../pages/About'));
const Privacy = lazyWithRetry(() => import('../pages/Privacy'));
const Terms = lazyWithRetry(() => import('../pages/Terms'));
const Gallery = lazyWithRetry(() => import('../pages/Gallery'));
const Hunt = lazyWithRetry(() => import('../pages/Hunt'));
const Livestream = lazyWithRetry(() => import('../pages/Livestream'));
const Calendar = lazyWithRetry(() => import('../pages/Calendar'));
const LanguageSettings = lazyWithRetry(() => import('../pages/LanguageSettings'));
const AuroraMap = lazyWithRetry(() => import('../pages/AuroraMap'));
const Blog = lazyWithRetry(() => import('../pages/Blog'));
const BlogPost = lazyWithRetry(() => import('../pages/BlogPost'));
const Referrals = lazyWithRetry(() => import('../pages/Referrals'));

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
        <Route path="/referrals" element={<AnimatedPage><Referrals /></AnimatedPage>} />
        <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  );
};
