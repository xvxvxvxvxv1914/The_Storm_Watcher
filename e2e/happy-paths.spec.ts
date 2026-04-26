import { test, expect, Page } from '@playwright/test';

// All NOAA endpoints are stubbed so tests don't depend on the live feed.
// Open-Meteo (UV/sun) is not used on the Dashboard so we don't need to stub
// it for these paths.
const stubNoaa = async (page: Page) => {
  await page.route(/services\.swpc\.noaa\.gov\/.*/, async (route) => {
    const url = route.request().url();
    if (url.includes('planetary_k_index_1m')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { time_tag: '2026-04-26T08:00:00', kp_index: 4.2 },
        ]),
      });
    }
    if (url.includes('noaa-planetary-k-index.json')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { time_tag: '2026-04-25T00:00:00', Kp: 3 },
          { time_tag: '2026-04-25T03:00:00', Kp: 4 },
        ]),
      });
    }
    if (url.includes('noaa-planetary-k-index-forecast.json')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
    if (url.includes('rtsw_wind_1m')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { time_tag: '2026-04-26T08:00:00', proton_speed: 420, proton_density: 5, active: true },
        ]),
      });
    }
    if (url.includes('rtsw_mag_1m')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { time_tag: '2026-04-26T08:00:00', bz_gsm: -2.5, bt: 5, active: true },
        ]),
      });
    }
    if (url.includes('xrays-1-day')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { time_tag: '2026-04-26T08:00:00', flux: 1e-7, energy: '0.1-0.8nm' },
        ]),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
};

test.describe('Happy paths', () => {
  test.beforeEach(async ({ page }) => {
    await stubNoaa(page);
    // Pre-set the onboarding flag for the first two tests so the Joyride
    // overlay doesn't intercept clicks. The third test clears it explicitly.
    await page.addInitScript(() => {
      localStorage.setItem('tsw-onboarding-seen', '1');
      localStorage.setItem('language', 'en');
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

  test('Settings → change Kp threshold and save', async ({ page }) => {
    await page.goto('/settings');

    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // React patches the value setter, so writing `el.value = '6'` directly
    // doesn't fire onChange. Use the native HTMLInputElement setter and let
    // React see the input event.
    await slider.evaluate((el: HTMLInputElement) => {
      const proto = Object.getPrototypeOf(el) as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(el, '6');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // The label updates synchronously to reflect the new threshold.
    await expect(page.getByText('Kp 6 — Strong Storm')).toBeVisible();

    await page.getByRole('button', { name: /^Save Settings$/ }).click();
    await expect(page.getByRole('button', { name: /^Saved!?$/ })).toBeVisible();

    // Reload — value persists from localStorage via SettingsContext.
    await page.reload();
    await expect(page.getByText('Kp 6 — Strong Storm')).toBeVisible();
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
