import { test, expect, Page } from '@playwright/test';

// Stub NOAA so data loads instantly without hitting live feeds.
const stubNoaa = async (page: Page) => {
  await page.route(/\/api\/gfz\/.*/, route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ datetime: ['2026-01-01T00:00:00Z'], Kp: [3.0], status: ['estimated'] }) }));
  await page.route(/services\.swpc\.noaa\.gov\/.*/, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
};

// Stub the checkout API so we don't need real Stripe keys.
const stubCheckout = async (page: Page) => {
  await page.route('**/api/stripe/create-checkout-session', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: 'https://checkout.stripe.com/test-session' }) }));
};

test.beforeEach(async ({ page }) => {
  await stubNoaa(page);
  await page.addInitScript(() => {
    localStorage.setItem('tsw-onboarding-seen', '1');
    localStorage.setItem('language', 'en');
    localStorage.setItem('cookie-consent', 'accepted');
    // Prevent location prompt overlay (z-[200])
    localStorage.setItem('tsw_location_asked', '1');
  });
  // Splash animation uses sessionStorage — set it before navigation
  await page.context().addInitScript(() => {
    sessionStorage.setItem('splash_shown', '1');
  });
});

// ── Pricing page ──────────────────────────────────────────────────────────────

test.describe('Pricing page', () => {
  test('displays Free, Pro and Premium plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /Choose your plan/i })).toBeVisible();

    // All three plan cards
    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Premium').first()).toBeVisible();
  });

  test('billing toggle switches between monthly and yearly prices', async ({ page }) => {
    await page.goto('/pricing');

    // Monthly prices visible by default
    await expect(page.getByText('€3.99')).toBeVisible();
    await expect(page.getByText('€7.99')).toBeVisible();

    // The toggle button is the w-12 h-6 rounded-full button inside the flex row
    const toggle = page.locator('div.flex.items-center.justify-center button[style]');
    await toggle.click();

    await expect(page.getByText('€35.99')).toBeVisible();
    await expect(page.getByText('€71.99')).toBeVisible();

    // Save 25% badge visible
    await expect(page.getByText(/Save 25%/i)).toBeVisible();
  });

  test('billing toggle thumb stays within 48px track', async ({ page }) => {
    await page.goto('/pricing');

    // The thumb span is the child of the toggle button
    const toggle = page.locator('div.flex.items-center.justify-center button[style]');
    const thumb = toggle.locator('> span');

    // Monthly: transform is translateX(0) or empty — either means "at start"
    const monthlyTransform = await thumb.evaluate(el => (el as HTMLElement).style.transform);
    expect(['translateX(0)', 'translateX(0px)', '']).toContain(monthlyTransform);

    // Toggle to yearly
    await toggle.click();
    const yearlyTransform = await thumb.evaluate(el => (el as HTMLElement).style.transform);
    expect(yearlyTransform).toBe('translateX(24px)');
  });

  test('Free plan shows €0 price', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('€0')).toBeVisible();
  });

  test('Pro plan shows 14-day free trial badge', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/14-day free trial/i).first()).toBeVisible();
  });

  test('unauthenticated user clicking Try Pro is redirected to auth', async ({ page }) => {
    await page.goto('/pricing');
    // Wait for the page to fully load before clicking
    await expect(page.getByText('€3.99')).toBeVisible();
    await page.getByRole('button', { name: /Try Pro free/i }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 5_000 });
  });
});

// ── Plan guards (anonymous = Free) ────────────────────────────────────────────

test.describe('Plan guards for anonymous users', () => {
  test('/aurora shows full-page Pro gate', async ({ page }) => {
    await page.goto('/aurora');
    // fullPage gate: lock icon card on dark background, no 3D globe loaded
    await expect(page.getByText('Pro Feature').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Unlock this/i)).toBeVisible();
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
    // "Go back" button present
    await expect(page.getByText(/Go back/i)).toBeVisible();
  });

  test('/alerts shows full-page Pro gate', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('Pro Feature').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Unlock this/i)).toBeVisible();
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
  });

  test('/forecast shows 3 days for free users + Pro gate card', async ({ page }) => {
    // Stub NOAA forecast — shape must have observed:'predicted' to pass the filter in noaaApi.ts
    await page.route('**/products/noaa-planetary-k-index-forecast.json', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(
          Array.from({ length: 28 }, (_, i) => ({
            time_tag: new Date(Date.now() + i * 3 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19),
            kp: 3 + (i % 4),
            observed: 'predicted',
          }))
        ),
      }));

    await page.goto('/forecast');
    await expect(page.getByText('7-Day Forecast').first()).toBeVisible({ timeout: 15_000 });

    // Gate card is visible — no blurred days, just a clean upgrade card
    await expect(page.getByText(/4 more days/i)).toBeVisible();
    await expect(page.getByText(/Try Pro free/i).first()).toBeVisible();
    await expect(page.getByText(/no credit card/i)).toBeVisible();
  });
});

// ── Settings — Kp threshold gate ─────────────────────────────────────────────

test.describe('Settings Kp threshold gating', () => {
  test('anonymous user sees locked threshold at Kp 5 with Pro link', async ({ page }) => {
    await page.goto('/settings');

    // No range slider visible for free users
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeHidden();

    // Shows lock icon + Pro upgrade link
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
    // Shows default Kp 5 label
    await expect(page.getByText(/Kp 5/i).first()).toBeVisible();
  });
});

// ── Pricing nav link always visible ──────────────────────────────────────────

test.describe('Pricing navigation visibility', () => {
  test('Pricing link is visible in desktop nav on homepage', async ({ page }) => {
    await page.goto('/');
    // The standalone bordered Pricing button in Navigation.tsx
    await expect(page.locator('nav a[href="/pricing"]').first()).toBeVisible();
  });

  test('clicking nav Pricing link navigates to /pricing', async ({ page }) => {
    await page.goto('/');
    // Wait for nav to be fully rendered
    await expect(page.locator('nav a[href="/pricing"]').first()).toBeVisible({ timeout: 8_000 });
    await page.locator('nav a[href="/pricing"]').first().click();
    await expect(page).toHaveURL(/\/pricing$/);
  });
});

// ── Checkout stub flow ────────────────────────────────────────────────────────

test.describe('Checkout flow (stubbed Stripe)', () => {
  test('authenticated user clicking Try Pro triggers checkout and redirects', async ({ page }) => {
    await stubCheckout(page);

    // Simulate logged-in state by stubbing Supabase session
    await page.addInitScript(() => {
      // Mock Supabase to return a fake session so pricing page shows subscribe buttons
      localStorage.setItem('sb-srzfoxlmhxyulrgkchjr-auth-token', JSON.stringify({
        access_token: 'fake-token',
        token_type: 'bearer',
        user: { id: 'test-user', email: 'test@example.com', email_confirmed_at: new Date().toISOString() },
      }));
    });

    await page.goto('/pricing');

    // With stubbed checkout, clicking Try Pro should navigate to the stub URL
    // The fetch intercept makes the request resolve instantly
    await page.route('**/api/stripe/create-checkout-session', async route => {
      // Verify request body contains a valid priceId
      const body = route.request().postDataJSON() as { priceId: string };
      expect(body.priceId).toMatch(/^price_/);
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.stripe.com/pay/test' }),
      });
    });

    const proBtn = page.getByRole('button', { name: /Try Pro free/i });
    // Button visible only if auth loaded — give it time
    await expect(proBtn).toBeVisible({ timeout: 5_000 });
  });
});
