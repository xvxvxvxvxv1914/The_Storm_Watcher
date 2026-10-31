import { test, expect, type Page } from '@playwright/test';
import { stubNoaa } from './fixtures/noaa';

test.beforeEach(async ({ page }) => {
  await stubNoaa(page);
  await page.route(/\/donki(?:\/|\?)/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(/https:\/\/(api\.open-meteo\.com|ipapi\.co|get\.geojs\.io)\//, route =>
    route.fulfill({ status: 503, body: 'Unavailable in this fixture' }));
  await page.addInitScript(() => {
    localStorage.setItem('tsw-onboarding-seen', '1');
    localStorage.setItem('language', 'en');
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('tsw_location_asked', '1');
    localStorage.setItem('tsw_settings', JSON.stringify({
      preferredLat: 42.7, preferredLon: 23.3,
      preferredLocationName: 'Sofia', locationMode: 'manual',
    }));
    sessionStorage.setItem('splash_shown', '1');
  });
});

test.describe('Free launch access', () => {
  test('access page offers the full product without prices or checkout', async ({ page }) => {
    const checkoutRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/stripe/create-checkout-session')) checkoutRequests.push(request.url());
    });
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: 'All features are free during launch' })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('€');
    await expect(page.getByRole('button', { name: /Try Pro|Get Premium|Subscribe/i })).toHaveCount(0);
    await expect(page.locator('nav a[href="/pricing"]').first()).toHaveText('Free access');
    await expect(page).toHaveTitle(/All features are free during launch/);
    await expect(page.locator('meta[name="description"][data-rh="true"]')).toHaveAttribute('content', /at no cost/);

    const screenshotDir = process.env.FREE_ACCESS_SCREENSHOT_DIR;
    if (screenshotDir) {
      await page.screenshot({ path: `${screenshotDir}/free-access-desktop-light.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${screenshotDir}/free-access-mobile-dark.png`, fullPage: true, animations: 'disabled' });
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    await page.locator('main').getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('[data-tour="kp-card"]')).toContainText('4.2');
    expect(checkoutRequests).toEqual([]);
  });

  test('localized access page keeps free metadata after React loads', async ({ page }) => {
    await page.goto('/bg/pricing');
    await expect(page.getByRole('heading', { name: 'Всички функции са безплатни в началния период' })).toBeVisible();
    await expect(page).toHaveTitle(/Всички функции са безплатни/);
    await expect(page.locator('meta[name="description"][data-rh="true"]')).toHaveAttribute('content', /безплатно/);
  });

  test('aurora and alerts open for anonymous visitors', async ({ page }) => {
    await page.goto('/aurora');
    await expect(page.locator('main h1')).toContainText(/Aurora/i);
    await expect(page.getByText('Pro Feature', { exact: true })).toHaveCount(0);

    await page.goto('/alerts');
    await expect(page.locator('main h1')).toContainText(/All clear/i);
    await expect(page.getByText('Pro Feature', { exact: true })).toHaveCount(0);
  });

  test('all seven forecast days are available without an upgrade', async ({ page }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    await page.route('**/products/noaa-planetary-k-index-forecast.json', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(Array.from({ length: 56 }, (_, i) => ({
          time_tag: new Date(start.getTime() + i * 3 * 3600_000).toISOString().replace('T', ' ').slice(0, 19),
          kp: 3 + (i % 4), observed: 'predicted',
        }))),
      }));
    await page.goto('/forecast');
    const heading = page.getByRole('heading', { name: '7-Day Forecast', exact: true });
    await expect(heading).toBeVisible();
    const dayRows = heading.locator('../..').locator('.space-y-2 > div > button');
    await expect(dayRows).toHaveCount(7);
    await expect(page.getByText(/4 more days|Upgrade to Pro|Try Pro free/i)).toHaveCount(0);
  });

  test('anonymous visitors can save Kp 3 and Bz early-warning preferences', async ({ page }) => {
    await page.goto('/settings');
    const kpSlider = page.locator('input[type="range"]').first();
    await expect(kpSlider).toHaveAttribute('min', '3');
    await kpSlider.focus();
    await kpSlider.press('Home');
    await page.getByRole('switch', { name: 'Bz early warning', exact: true }).click();
    const bzSlider = page.getByRole('slider', { name: 'Bz threshold', exact: true });
    await bzSlider.focus();
    await bzSlider.press('End');
    await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Saved!?$/ })).toBeVisible();

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tsw_settings') ?? '{}'));
    expect(saved).toMatchObject({ kpThreshold: 3, bzAlertsEnabled: true, bzThreshold: -5 });
    await expect(page.getByText(/Custom thresholds require|Upgrade to Premium/i)).toHaveCount(0);
  });

  test('saved locations are available beyond the old free and Pro quotas', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tsw_fav_locations', JSON.stringify(Array.from({ length: 10 }, (_, i) => ({
        id: `saved-${i}`, name: `Place ${i}`, lat: 60 + i, lon: 10 + i,
      }))));
    });
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Sofia', exact: true }).click();
    await page.getByRole('button', { name: 'Save "Sofia"', exact: true }).click();
    const favorites = await page.evaluate(() => JSON.parse(localStorage.getItem('tsw_fav_locations') ?? '[]'));
    expect(favorites).toHaveLength(11);
    expect(favorites[10]).toMatchObject({ name: 'Sofia', lat: 42.7, lon: 23.3 });
  });

  test('anonymous visitors can download CSV data', async ({ page }) => {
    await page.goto('/dashboard');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Kp History (3 days)', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^kp-history-.*\.csv$/);
    const stream = await download.createReadStream();
    const parts: Buffer[] = [];
    for await (const part of stream) parts.push(Buffer.from(part));
    const csv = Buffer.concat(parts).toString('utf8');
    expect(csv).toContain('timestamp,kp_index');
    expect(csv).toContain('2026-04-26T08:00:00,4.2');
  });

  test('personal aurora logs still require an account', async ({ page }) => {
    await page.goto('/log');
    await expect(page.getByRole('heading', { name: 'Sign in to access your Aurora Log' })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /Sign in/ })).toHaveAttribute('href', '/auth');
    await expect(page.getByText('Upgrade to Pro', { exact: true })).toHaveCount(0);
  });

  test('a signed-in free account can open its personal aurora log', async ({ page }) => {
    await signInFreeAccount(page);
    await page.goto('/log');
    await expect(page.getByRole('heading', { name: 'Aurora Log', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log sighting', exact: true })).toBeVisible();
    await expect(page.getByText('Upgrade to Pro', { exact: true })).toHaveCount(0);
  });
});

async function signInFreeAccount(page: Page) {
  const user = {
    id: '00000000-0000-0000-0000-000000000001', email: 'test@example.com',
    email_confirmed_at: '2026-01-01T00:00:00Z', role: 'authenticated',
    app_metadata: {}, user_metadata: {},
  };
  await page.route(/supabase\.co\/auth\/v1\/token/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      access_token: 'mock_token', refresh_token: 'mock_refresh', token_type: 'bearer',
      expires_in: 3600, user,
    }) }));
  await page.route(/supabase\.co\/auth\/v1\/user/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route(/supabase\.co\/rest\/v1\/profiles/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ...user, full_name: 'Free Explorer', plan: 'free',
      subscription_status: null, referral_pro_until: null,
    }) }));
  await page.goto('/auth');
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill('SecurePass123!');
  await page.locator('form').getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
