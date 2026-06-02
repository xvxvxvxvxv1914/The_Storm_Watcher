import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

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

  // Phase B (push-to-update): the native side emits the APNs push token for each
  // activity so the backend can refresh the banner while the app is closed.
  addListener(
    eventName: 'liveActivityPushToken',
    listener: (data: { token: string; activityId: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'liveActivityEnded',
    listener: (data: { activityId: string }) => void,
  ): Promise<PluginListenerHandle>;
}

// Native (iOS) implementation lives in StormLiveActivityPlugin.swift. On web /
// unsupported platforms the proxy methods reject — callers must guard with isIos().
export const StormLiveActivity = registerPlugin<StormLiveActivityPlugin>('StormLiveActivity');
