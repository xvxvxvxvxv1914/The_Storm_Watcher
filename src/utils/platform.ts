import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const isIos = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * Marks the document as the Android build so `styles/material.css` can apply the
 * Material 3 form language — navigation bar, tonal surfaces, Roboto, shape scale
 * — without touching web or iOS, which keep the existing look.
 *
 * Must run before the first paint, otherwise the iOS-style chrome renders for a
 * frame and swaps. It is called from `main.tsx` ahead of `createRoot`, not from a
 * React effect, for exactly that reason.
 *
 * In dev only, `?md3=1` forces the class on so the Android skin can be checked in
 * a desktop browser; `?md3=0` forces it off on a device.
 */
export function applyPlatformClass(): void {
  let android = isAndroid();

  if (import.meta.env.DEV) {
    const flag = new URLSearchParams(window.location.search).get('md3');
    if (flag === '1') android = true;
    else if (flag === '0') android = false;
  }

  document.documentElement.classList.toggle('md3', android);
}

/**
 * Whether the Material skin is active. Reads the class rather than calling
 * `isAndroid()` again so the dev `?md3=` override applies to components too —
 * otherwise the CSS and the JSX would disagree about which platform this is.
 */
export const isMaterial = (): boolean =>
  document.documentElement.classList.contains('md3');
