import { registerPlugin } from '@capacitor/core';

export interface StormLiveActivityState {
  kp: number;
  gLevel: number;
  auroraPct?: number;
}

export interface StormLiveActivityPlugin {
  start(state: StormLiveActivityState): Promise<{ started: boolean; reason?: string }>;
  // `updated` is false when no live activity exists (e.g. the user dismissed it),
  // which tells the caller to restart rather than silently no-op.
  update(state: StormLiveActivityState): Promise<{ updated: boolean }>;
  end(): Promise<void>;
}

// Native (iOS) implementation lives in StormLiveActivityPlugin.swift. On web /
// unsupported platforms the proxy methods reject — callers must guard with isIos().
export const StormLiveActivity = registerPlugin<StormLiveActivityPlugin>('StormLiveActivity');
