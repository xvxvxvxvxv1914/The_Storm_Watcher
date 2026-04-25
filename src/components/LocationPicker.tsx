import { useEffect, useRef, useState } from 'react';
import { MapPin, Star, Locate, X, ChevronDown } from 'lucide-react';
import { useFavoriteLocations } from '../hooks/useFavoriteLocations';

interface Props {
  lat: number;
  lon: number;
  locationName: string;
  onSelect: (lat: number, lon: number, name: string) => void;
  onRequestGPS: () => void;
}

export default function LocationPicker({ lat, lon, locationName, onSelect, onRequestGPS }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { favorites, maxFavorites, add, remove, isSaved } = useFavoriteLocations();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAdd = () => {
    if (locationName && lat && lon) add(locationName, lat, lon);
  };

  const alreadySaved = lat && lon ? isSaved(lat, lon) : false;
  const canAdd = !alreadySaved && favorites.length < maxFavorites && !!locationName;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 glass-surface rounded-full border border-white/10 text-sm text-[#94a3b8] hover:text-white hover:border-white/25 transition-colors"
      >
        <MapPin className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
        <span className="max-w-[180px] truncate">{locationName || 'Select location'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 glass-surface rounded-xl shadow-2xl border border-white/10 py-2 z-50">

          {/* GPS option */}
          <button
            onClick={() => { onRequestGPS(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Locate className="w-4 h-4 text-[#10b981] shrink-0" />
            <span>Use my GPS</span>
          </button>

          {/* Saved favorites */}
          {favorites.length > 0 && (
            <>
              <div className="border-t border-white/5 mt-1 pt-1">
                <div className="px-4 py-1.5 text-[10px] text-[#64748b] uppercase tracking-widest">Saved</div>
                {favorites.map(fav => (
                  <div key={fav.id} className="flex items-center group px-4 py-2 hover:bg-white/5">
                    <button
                      onClick={() => { onSelect(fav.lat, fav.lon, fav.name); setOpen(false); }}
                      className="flex items-center gap-2 flex-1 text-sm text-[#94a3b8] hover:text-white transition-colors text-left"
                    >
                      <Star className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
                      <span className="truncate">{fav.name}</span>
                    </button>
                    <button
                      onClick={() => remove(fav.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-red-400 transition-all p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Add current */}
          <div className="border-t border-white/5 mt-1 pt-1">
            {canAdd ? (
              <button
                onClick={() => { handleAdd(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#f97316] hover:bg-[#f97316]/10 transition-colors"
              >
                <Star className="w-4 h-4 shrink-0" />
                <span className="truncate">Save "{locationName}"</span>
              </button>
            ) : alreadySaved ? (
              <div className="px-4 py-2 text-xs text-[#64748b]">Location already saved</div>
            ) : favorites.length >= maxFavorites ? (
              <div className="px-4 py-2 text-xs text-[#64748b]">
                Limit reached ({maxFavorites} locations)
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
