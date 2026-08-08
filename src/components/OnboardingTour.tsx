import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';

/**
 * Lazy gate for the onboarding tour.
 *
 * This component is mounted in App.tsx, so whatever it imports lands in the
 * chunk every visitor downloads on every page. react-joyride pulls in
 * @floating-ui, @gilbarbara/hooks, is-lite and @fastify/deepmerge — ~207 kB of
 * source — to render a tour that a returning user never sees again. Only the
 * cheap decision lives here; the tour itself loads on demand.
 */
const JoyrideTour = lazy(() => import('./JoyrideTour'));

const OnboardingTour = () => {
  const { seen } = useOnboarding();
  const location = useLocation();
  // Latched, not derived: once the tour is loaded it must survive the user
  // navigating off /dashboard mid-tour, which unmounting would abort.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (seen || armed) return;
    if (location.pathname !== '/dashboard') return;
    setArmed(true);
  }, [seen, armed, location.pathname]);

  if (!armed) return null;

  // No fallback — the tour appearing a moment late is the correct behaviour;
  // it already waits 800 ms for the Dashboard anchors either way.
  return (
    <Suspense fallback={null}>
      <JoyrideTour />
    </Suspense>
  );
};

export default OnboardingTour;
