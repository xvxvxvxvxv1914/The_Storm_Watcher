import { Link } from 'react-router-dom';
import { CalendarClock, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useStormOutlook, dismissOutlook } from '../hooks/useStormOutlook';
import { gLevel } from '../hooks/useStormLiveActivity';

/**
 * "A storm is coming" — the counterpart to the live strip in Navigation, which
 * only fires once Kp has already crossed 5 and the visitor has missed the run-up.
 *
 * Deliberately unlike that strip in three ways:
 *  - it never shows alongside it (Navigation gates this on the live Kp being
 *    below storm level), so the header never carries two contradictory tenses;
 *  - solid and still, where the live one is a pulsing gradient — this is a
 *    heads-up, and a forecast that screams as loudly as a measurement teaches
 *    people to ignore both;
 *  - dismissible, because it can stand for three days.
 *
 * Colour still carries the severity, though: the band comes from the same Kp
 * thresholds as the gauge and both widgets, never from a neutral chrome token.
 */
const StormWatchBanner = () => {
  const { t, language } = useLanguage();
  const { outlook, visible } = useStormOutlook();

  if (!visible || !outlook) return null;

  const level = gLevel(outlook.kp);
  const severe = outlook.kp >= 7; // G3+ — the red band on the gauge

  // Two widths of the same instant. At 390px the full form truncated mid-word
  // ("…Aug 14, 06:28 P…"), and the time is the part worth keeping — the peak is
  // never more than three days out, so the weekday alone places it.
  //
  // The minutes stay even though NOAA's bins are hour-aligned: dropping them
  // leaves en-GB rendering a bare "21", which reads as a date, not a time.
  const whenShort = outlook.at.toLocaleString(language, {
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
  const whenFull = outlook.at.toLocaleString(language, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 px-4 py-2 border-b ${
        severe
          ? 'bg-[#7f1d1d] border-[#ef4444]'
          : 'bg-[#7c2d12] border-[#f97316]'
      }`}
    >
      {/* The colour is inline, not `text-white`, on purpose: index.css repaints
          `html.light a.text-white` / `span.text-white` to #1e293b so ordinary
          labels stay legible on the light surface. This strip is a deliberately
          dark fill in *both* themes, so it needs the same exemption the file
          already grants bg-slate-900 — an inline style is the local way to take
          it without teaching a global stylesheet about this component. */}
      <Link
        to="/forecast"
        style={{ color: '#ffffff' }}
        className="flex-1 min-w-0 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
      >
        <CalendarClock className="w-4 h-4 shrink-0" />
        {/* Only the label is uppercased. Running the localised date through
            `uppercase` too gave "THU, AUG 13, 06:04 PM" — shouting, and wrong
            for the locales that case their month names deliberately. */}
        <span className="shrink-0 font-bold uppercase tracking-wider text-xs sm:text-sm">
          {t('stormWatch.expected') || 'Storm expected'}
        </span>
        <span className="truncate text-xs sm:text-sm">
          {`G${level} · Kp ${outlook.kp.toFixed(1)} · `}
          <span className="sm:hidden">{whenShort}</span>
          <span className="hidden sm:inline">{whenFull}</span>
        </span>
      </Link>
      <button
        onClick={dismissOutlook}
        aria-label={t('stormWatch.dismiss') || 'Dismiss'}
        style={{ color: 'rgba(255,255,255,0.75)' }}
        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default StormWatchBanner;
