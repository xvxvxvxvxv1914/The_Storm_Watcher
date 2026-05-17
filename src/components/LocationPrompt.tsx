/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

const ASKED_KEY = 'tsw_location_asked';

export function useLocationPromptVisible() {
  const { settings } = useSettings();
  const alreadyAsked = localStorage.getItem(ASKED_KEY) === '1';
  return settings.preferredLat === null && !alreadyAsked;
}

const LocationPrompt = ({ onDone }: { onDone: () => void }) => {
  const { updateSettings } = useSettings();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const allow = () => {
    if (!navigator.geolocation) { dismiss(); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          ).then(r => r.json());
          const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
          const country = geo.address?.country || '';
          if (city || country) name = [city, country].filter(Boolean).join(', ');
        } catch { /* keep coords as name */ }
        updateSettings({ preferredLat: lat, preferredLon: lon, preferredLocationName: name });
        localStorage.setItem(ASKED_KEY, '1');
        setLoading(false);
        onDone();
      },
      () => { dismiss(); },
      { timeout: 8000 }
    );
  };

  const dismiss = () => {
    localStorage.setItem(ASKED_KEY, '1');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="glass-surface rounded-2xl p-6 max-w-sm w-full border border-white/10 relative">
        <button onClick={dismiss} className="absolute top-4 right-4 text-[#64748b] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-[#10b981]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{t('location.prompt.title') || 'Your Location'}</h3>
            <p className="text-[#64748b] text-xs">{t('location.prompt.once') || 'Asked only once'}</p>
          </div>
        </div>

        <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
          {t('location.prompt.desc') || 'Allow location access for personalized UV index, sky visibility, sun times and more — tailored to where you are.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={allow}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? '...' : (t('location.prompt.allow') || 'Allow Location')}
          </button>
          <button
            onClick={dismiss}
            className="px-4 py-3 rounded-xl border border-white/10 text-[#94a3b8] hover:text-white text-sm transition-colors"
          >
            {t('location.prompt.skip') || 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPrompt;
