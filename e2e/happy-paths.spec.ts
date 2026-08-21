import { test, expect } from '@playwright/test';
import { stubNoaa } from './fixtures/noaa';

test.describe('Happy paths', () => {
  test.beforeEach(async ({ page }) => {
    await stubNoaa(page);
    // Pre-set the onboarding flag for the first two tests so the Joyride
    // overlay doesn't intercept clicks. The third test clears it explicitly.
    await page.addInitScript(() => {
      localStorage.setItem('tsw-onboarding-seen', '1');
      localStorage.setItem('language', 'en');
      // Prevent LocationPrompt (z-[200]) and CookieConsent overlays
      localStorage.setItem('tsw_location_asked', '1');
      localStorage.setItem('cookie-consent', 'accepted');
    });
    // SplashAnimation uses sessionStorage
    await page.context().addInitScript(() => {
      sessionStorage.setItem('splash_shown', '1');
    });
  });

  test('Home → Dashboard navigation surfaces the Kp index', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Storm Watcher/i);

    // Desktop nav has a "Dashboard" link; click the first visible one.
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // The KP card has data-tour="kp-card" — wait for it and verify the
    // mocked Kp value (4.2) is rendered.
    const kpCard = page.locator('[data-tour="kp-card"]');
    await expect(kpCard).toBeVisible();
    await expect(kpCard).toContainText('4.2', { timeout: 10_000 });
  });

  test('Settings → Kp threshold locked for free users, other settings save correctly', async ({ page }) => {
    await page.goto('/settings');

    // Payments are enabled in e2e — free (anonymous) users see the threshold
    // locked at Kp 5 with a Pro upgrade link instead of a range slider.
    await expect(page.locator('input[type="range"]')).toBeHidden();
    await expect(page.getByText(/Kp 5/i).first()).toBeVisible();
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();

    // Other settings (units) are still editable and save works.
    await page.getByRole('button', { name: /^Save Settings$/ }).click();
    await expect(page.getByRole('button', { name: /^Saved!?$/ })).toBeVisible();
  });

  test('Onboarding tour appears on first dashboard visit and can be skipped', async ({ page }) => {
    // Override the beforeEach flag so the tour actually runs this time.
    await page.addInitScript(() => {
      localStorage.removeItem('tsw-onboarding-seen');
    });

    await page.goto('/dashboard');

    // Joyride mounts the welcome step in a portal once the dashboard loads.
    const welcomeTitle = page.getByText('Welcome to The Storm Watcher');
    await expect(welcomeTitle).toBeVisible({ timeout: 10_000 });

    // Skip the tour.
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await expect(welcomeTitle).toBeHidden();

    // Reload — flag is now persisted, tour does not re-trigger.
    await page.reload();
    await expect(welcomeTitle).toBeHidden({ timeout: 5_000 });
  });
});
