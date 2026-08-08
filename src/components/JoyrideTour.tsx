import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnboarding } from '../hooks/useOnboarding';

/**
 * The actual Joyride tour. Kept behind the lazy boundary in OnboardingTour.tsx —
 * react-joyride and its @floating-ui / @gilbarbara dependency tree are ~207 kB of
 * source, and a one-time onboarding tour has no business in the chunk every
 * visitor downloads on every page.
 */
const JoyrideTour = () => {
  const { t } = useLanguage();
  const { seen, markSeen } = useOnboarding();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [availableTargets, setAvailableTargets] = useState<Set<string> | null>(null);

  // Trigger only on Dashboard for users who haven't seen the tour. Slight
  // delay so Joyride can find the data-tour anchors after Dashboard's
  // loading state resolves. Snapshot which anchors actually exist — on
  // mobile some steps target desktop-only elements (user-menu, push-bell)
  // and Joyride breaks on missing targets.
  useEffect(() => {
    if (seen) return;
    if (location.pathname !== '/dashboard') return;
    const id = window.setTimeout(() => {
      const targets = new Set<string>();
      for (const sel of ['[data-tour="kp-card"]', '[data-tour="wind-card"]', '[data-tour="push-bell"]', '[data-tour="user-menu"]']) {
        const el = document.querySelector(sel);
        if (el && (el as HTMLElement).offsetParent !== null) targets.add(sel);
      }
      setAvailableTargets(targets);
      setRun(true);
    }, 800);
    return () => window.clearTimeout(id);
  }, [seen, location.pathname]);

  const steps: Step[] = useMemo<Step[]>(() => [
    {
      target: 'body',
      placement: 'center',
      title: t('onboarding.welcome.title'),
      content: t('onboarding.welcome.body'),
    },
    {
      target: '[data-tour="kp-card"]',
      title: t('onboarding.kp.title'),
      content: t('onboarding.kp.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="wind-card"]',
      title: t('onboarding.wind.title'),
      content: t('onboarding.wind.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="push-bell"]',
      title: t('onboarding.push.title'),
      content: t('onboarding.push.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="user-menu"]',
      title: t('onboarding.settings.title'),
      content: t('onboarding.settings.body'),
      placement: 'bottom',
    },
  ], [t]).filter(step =>
    step.target === 'body' || availableTargets === null || availableTargets.has(step.target as string)
  );

  const handleEvent = (data: EventData) => {
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(data.status)) {
      setRun(false);
      markSeen();
    }
  };

  if (seen && !run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={{
        back: t('onboarding.back'),
        close: t('onboarding.close'),
        last: t('onboarding.last'),
        next: t('onboarding.next'),
        skip: t('onboarding.skip'),
      }}
      options={{
        buttons: ['back', 'skip', 'primary'],
        closeButtonAction: 'skip',
        primaryColor: '#f97316',
        backgroundColor: '#0a0a1a',
        textColor: '#e2e8f0',
        arrowColor: '#0a0a1a',
        overlayColor: 'rgba(2, 6, 23, 0.7)',
        zIndex: 10000,
      }}
      styles={{
        tooltip: {
          borderRadius: 16,
          fontSize: 14,
        },
        tooltipTitle: {
          color: '#fbbf24',
          fontWeight: 700,
        },
      }}
    />
  );
};

export default JoyrideTour;
