/**
 * Native In-App Purchase hook for iOS (StoreKit 2) and Android (Play Billing).
 *
 * Setup (required before App Store / Play Store submission):
 *   npm install @capgo/capacitor-purchases
 *   npx cap sync
 *   → Add RevenueCat API keys to capacitor.config.ts (Purchases plugin config)
 *   OR use @capacitor-community/in-app-purchases-2 without RevenueCat.
 *
 * Product IDs must be created in:
 *   iOS  → App Store Connect > In-App Purchases
 *   Android → Google Play Console > In-app products / Subscriptions
 *
 * Suggested product IDs (match these in both stores):
 *   com.stormwatcher.app.pro.monthly
 *   com.stormwatcher.app.pro.yearly
 *   com.stormwatcher.app.premium.monthly
 *   com.stormwatcher.app.premium.yearly
 */

import { useState, useCallback } from 'react';
import { isNative, isIos, isAndroid } from '../utils/platform';
import { supabase } from '../lib/supabase';

export type IAPPlan = 'pro' | 'premium';
export type IAPBilling = 'monthly' | 'yearly';

export interface IAPProduct {
  id: string;
  title: string;
  price: string;
  localizedPrice: string;
}

// Product ID map — must match App Store Connect / Play Console exactly
const PRODUCT_IDS: Record<IAPPlan, Record<IAPBilling, string>> = {
  pro: {
    monthly: 'com.stormwatcher.app.pro.monthly',
    yearly:  'com.stormwatcher.app.pro.yearly',
  },
  premium: {
    monthly: 'com.stormwatcher.app.premium.monthly',
    yearly:  'com.stormwatcher.app.premium.yearly',
  },
};

// Display prices shown while the real IAP prices are loading
const FALLBACK_PRICES: Record<IAPPlan, Record<IAPBilling, string>> = {
  pro:     { monthly: '€3.99', yearly: '€35.99' },
  premium: { monthly: '€7.99', yearly: '€71.99' },
};

export function useIAP() {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const getProductId = useCallback((plan: IAPPlan, billing: IAPBilling) =>
    PRODUCT_IDS[plan][billing], []);

  const getFallbackPrice = useCallback((plan: IAPPlan, billing: IAPBilling) =>
    FALLBACK_PRICES[plan][billing], []);

  /**
   * Initiate a native IAP purchase.
   * Calls the @capgo/capacitor-purchases (or equivalent) plugin,
   * then sends the receipt to the Supabase verify-iap Edge Function.
   *
   * To enable: install the IAP plugin, uncomment the plugin imports,
   * and replace the TODO block below with actual plugin calls.
   */
  const purchase = useCallback(async (plan: IAPPlan, billing: IAPBilling) => {
    if (!isNative()) return;
    setError('');
    const productId = getProductId(plan, billing);
    setPurchasing(productId);

    try {
      // TODO: replace with actual plugin call once installed
      // Example with @capgo/capacitor-purchases:
      //   const { Purchases } = await import('@capgo/capacitor-purchases');
      //   const result = await Purchases.purchaseStoreProduct({ product: { productIdentifier: productId } });
      //   const receipt = isIos()
      //     ? result.transaction.transactionIdentifier
      //     : result.transaction.purchaseToken;
      //   await verifyReceipt(plan, billing, receipt);

      throw new Error('IAP plugin not yet installed — see src/hooks/useIAP.ts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  }, [getProductId]);

  /**
   * Restore previous purchases — required by App Store guidelines.
   * Must be callable from a visible "Restore Purchases" button.
   */
  const restore = useCallback(async () => {
    if (!isNative()) return;
    setError('');
    setPurchasing('restore');
    try {
      // TODO: replace with actual plugin call
      // const { Purchases } = await import('@capgo/capacitor-purchases');
      // const { activeSubscriptions } = await Purchases.restorePurchases();
      // if (activeSubscriptions.length > 0) {
      //   await verifyReceipt('restore', 'monthly', activeSubscriptions[0].productIdentifier);
      // }
      throw new Error('IAP plugin not yet installed — see src/hooks/useIAP.ts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setPurchasing(null);
    }
  }, []);

  return {
    isNativeIAP: isNative(),
    isIos: isIos(),
    isAndroid: isAndroid(),
    purchasing,
    error,
    purchase,
    restore,
    getProductId,
    getFallbackPrice,
  };
}

/**
 * Send the native receipt to the Supabase verify-iap Edge Function.
 * The function validates with Apple/Google and updates profiles.plan.
 */
export async function verifyReceipt(
  plan: IAPPlan,
  billing: IAPBilling,
  receiptOrToken: string,
) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-iap`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        platform: isIos() ? 'ios' : 'android',
        receipt: receiptOrToken,
        plan,
        billing,
      }),
    }
  );
  if (!res.ok) {
    const { error } = await res.json() as { error: string };
    throw new Error(error ?? 'Receipt verification failed');
  }
}
