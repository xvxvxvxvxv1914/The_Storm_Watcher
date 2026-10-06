/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isNative } from '../utils/platform';
import { getStoredReferralCode, clearStoredReferralCode } from '../utils/referral';
import { logError } from '../utils/logger';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'premium';
  is_beta: boolean;
  weekly_digest: boolean;
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_period_end?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  referral_pro_until?: string | null;
  quiet_start?: number | null;
  quiet_end?: number | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileError: boolean;
  retryProfile: () => void;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithFacebook: () => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileReqRef = useRef(0);
  const activeUserRef = useRef<string | null>(null);
  const [profileError, setProfileError] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const req = ++profileReqRef.current;
    setProfileError(false);
    const isCurrent = () => req === profileReqRef.current && activeUserRef.current === userId;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!isCurrent()) return;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        try {
          const { data, error, status } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, plan, is_beta, weekly_digest, subscription_status, subscription_period_end, referral_code, referred_by, referral_pro_until, created_at, updated_at')
            .eq('id', userId)
            .abortSignal(ctrl.signal)
            .maybeSingle();
          if (!isCurrent()) return;
          if (error) {
            // Supabase returns network failures as plain objects, not Error instances.
            const transient = status === 0 || status >= 500 ||
              /Failed to fetch|Load failed|NetworkError|AbortError|TimeoutError/i.test(error.message);
            if (attempt === 0 && transient) {
              await new Promise(resolve => setTimeout(resolve, 750));
              continue;
            }
            throw error;
          }
          if (!data) throw new Error('Account profile is unavailable');
          setProfile(data);
          return;
        } finally {
          clearTimeout(timer);
        }
      }
    } catch (error) {
      if (!isCurrent()) return;
      setProfileError(true);
      logError('Error fetching profile:', error);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  const retryProfile = useCallback(() => {
    if (activeUserRef.current) {
      setLoading(true);
      void fetchProfile(activeUserRef.current);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let initialDone = false;
    let disposed = false;
    const applySession = (next: Session | null) => {
      if (disposed) return;
      const nextId = next?.user.id ?? null;
      if (nextId !== activeUserRef.current) {
        ++profileReqRef.current;
        setProfile(null);
        setProfileError(false);
        setLoading(nextId !== null);
      }
      activeUserRef.current = nextId;
      setSession(next);
      setUser(next?.user ?? null);
      if (nextId) void fetchProfile(nextId);
      else setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (initialDone || disposed) return;
      initialDone = true;
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      initialDone = true;
      // Leave the auth callback before querying: the SDK can still hold its auth lock.
      queueMicrotask(() => applySession(session));
    });

    const cancelProfile = () => {
      ++profileReqRef.current;
      activeUserRef.current = null;
    };
    window.addEventListener('tsw:profile-refresh', retryProfile);
    window.addEventListener('online', retryProfile);
    return () => {
      disposed = true;
      cancelProfile();
      subscription.unsubscribe();
      window.removeEventListener('tsw:profile-refresh', retryProfile);
      window.removeEventListener('online', retryProfile);
    };
  }, [fetchProfile, retryProfile]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Where Supabase sends the user after they click the confirmation link.
    // Web confirms back to the same origin (so staging confirms to staging);
    // native opens the link in the device browser, so target the live site.
    const emailRedirectTo = isNative() ? 'https://thestormwatcher.com' : window.location.origin;
    // If the visitor arrived via a referral link, attribute it. The handle_new_user
    // trigger resolves the code to a referrer server-side (clients can't write it).
    const referredByCode = getStoredReferralCode() ?? undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          ...(referredByCode ? { referred_by_code: referredByCode } : {}),
        },
      },
    });
    if (!error) clearStoredReferralCode();
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // On native the OAuth page must open in SFSafariViewController (Google
  // rejects embedded webviews) and Supabase must redirect back into the app
  // via the stormwatcher:// scheme — App.tsx handles the auth-callback deep
  // link and calls setSession with the returned tokens.
  const signInWithProvider = async (provider: 'google' | 'facebook' | 'apple') => {
    if (isNative()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'stormwatcher://auth-callback',
          skipBrowserRedirect: true,
        },
      });
      if (!error && data?.url) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: data.url });
      }
      return { error };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'https://thestormwatcher.com',
      },
    });
    return { error };
  };

  const signInWithGoogle = () => signInWithProvider('google');
  const signInWithFacebook = () => signInWithProvider('facebook');
  const signInWithApple = () => signInWithProvider('apple');

  const signOut = async () => {
    await supabase.auth.signOut();
    ++profileReqRef.current;
    activeUserRef.current = null;
    setProfileError(false);
    sessionStorage.removeItem('session_id');
    // Clear user-specific localStorage keys on logout.
    // Intentionally kept: 'theme', 'language', 'tsw_settings', 'cookie-consent',
    // 'tsw_location_asked' — these are device-level preferences, not account data.
    localStorage.removeItem('tsw_hunt_last_sighting');
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://thestormwatcher.com/auth/reset',
    });
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Allowlist: only permit safe fields to be updated by the client
      const { full_name, avatar_url, weekly_digest } = updates;
      const safeUpdates: Record<string, unknown> = {};
      if (full_name !== undefined) safeUpdates.full_name = full_name;
      if (avatar_url !== undefined) safeUpdates.avatar_url = avatar_url;
      if (weekly_digest !== undefined) safeUpdates.weekly_digest = weekly_digest;

      if (Object.keys(safeUpdates).length === 0) {
        return { error: new Error('No valid fields to update') };
      }

      const { error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    profileError,
    retryProfile,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
