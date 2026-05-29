// Referral code capture. A visitor arriving via …/?ref=CODE has the code stashed
// in localStorage so it survives navigation + the signup round-trip, then is read
// once at signUp and attributed server-side by the handle_new_user trigger.

const KEY = 'tsw_ref_code';

// Codes are 8 chars from an unambiguous alphabet (see gen_referral_code migration).
const CODE_RE = /^[A-Z2-9]{8}$/;

/** Call on app load — if the URL carries ?ref=CODE, persist it. */
export function captureReferralCode(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ref')?.trim().toUpperCase();
    if (raw && CODE_RE.test(raw)) {
      window.localStorage.setItem(KEY, raw);
    }
  } catch {
    /* private mode / no storage — referral attribution simply won't happen */
  }
}

export function getStoredReferralCode(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
