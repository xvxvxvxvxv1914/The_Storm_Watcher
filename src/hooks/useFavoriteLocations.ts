import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface FavoriteLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const LS_KEY = 'tsw_fav_locations';

function loadLocalFavorites(): FavoriteLocation[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveLocalFavorites(items: FavoriteLocation[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* full */ }
}

export function useFavoriteLocations() {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const maxFavorites = (profile?.plan === 'pro' || profile?.plan === 'premium') ? 10 : 3;

  useEffect(() => {
    if (!user) {
      setFavorites(loadLocalFavorites());
      return;
    }
    setLoading(true);
    supabase
      .from('favorite_locations')
      .select('id, name, lat, lon')
      .eq('user_id', user.id)
      .order('created_at')
      .then(({ data }) => {
        setFavorites((data as FavoriteLocation[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const add = useCallback(async (name: string, lat: number, lon: number) => {
    if (favorites.length >= maxFavorites) return;

    if (!user) {
      const newFav: FavoriteLocation = { id: crypto.randomUUID(), name, lat, lon };
      const updated = [...favorites, newFav];
      setFavorites(updated);
      saveLocalFavorites(updated);
      return;
    }

    const { data } = await supabase
      .from('favorite_locations')
      .insert({ user_id: user.id, name, lat, lon })
      .select('id, name, lat, lon')
      .single();
    if (data) setFavorites(prev => [...prev, data as FavoriteLocation]);
  }, [favorites, maxFavorites, user]);

  const remove = useCallback(async (id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (!user) saveLocalFavorites(updated);
      return updated;
    });
    if (user) {
      await supabase.from('favorite_locations').delete().eq('id', id).eq('user_id', user.id);
    }
  }, [user]);

  const isSaved = useCallback((lat: number, lon: number) =>
    favorites.some(f => Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01),
  [favorites]);

  return { favorites, loading, maxFavorites, add, remove, isSaved };
}
