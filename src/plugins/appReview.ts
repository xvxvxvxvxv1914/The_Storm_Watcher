import { registerPlugin } from '@capacitor/core';
import { isIos } from '../utils/platform';

// Native side: ios/App/App/AppReviewPlugin.swift (registered in
// ViewController.capacitorDidLoad — Capacitor 8 has no auto-discovery for
// app-target plugins).
const AppReview = registerPlugin<{ requestReview(): Promise<void> }>('AppReview');

const ASKED_KEY = 'tsw_review_asked';
const MIN_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Ask for an App Store rating at a positive moment. iOS additionally caps the
// dialog at 3× per year, so this can never spam — but we still keep our own
// 90-day guard so the request is spent on a fresh positive moment.
export async function maybeAskForReview(): Promise<void> {
  if (!isIos()) return;
  try {
    const last = Number(localStorage.getItem(ASKED_KEY) || 0);
    if (Date.now() - last < MIN_INTERVAL_MS) return;
    localStorage.setItem(ASKED_KEY, String(Date.now()));
    await AppReview.requestReview();
  } catch {
    // plugin unavailable — never break the calling flow
  }
}
