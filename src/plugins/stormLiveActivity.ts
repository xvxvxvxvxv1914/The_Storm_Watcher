import { registerPlugin } from '@capacitor/core';

export interface StormLiveActivityState {
  kp: number;
  gLevel: number;
  auroraPct?: number;
}

export interface StormLiveActivityPlugin {
  start(state: StormLiveActivityState): Promise<{ started: boolean; reason?: string }>;
  update(state: StormLiveActivityState): Promise<void>;
  end(): Promise<void>;
}

// Native (iOS) implementation lives in StormLiveActivityPlugin.swift. On web /
// unsupported platforms the proxy methods reject — callers must guard with isIos().
export const StormLiveActivity = registerPlugin<StormLiveActivityPlugin>('StormLiveActivity');
