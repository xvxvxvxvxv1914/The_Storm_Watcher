import { test, expect, Page } from '@playwright/test';

// Intercepts all Supabase auth API calls so tests run without a real Supabase project.
async function stubSupabaseAuth(page: Page, opts: {
  signInResult?: 'success' | 'invalid_credentials';
  signUpResult?: 'success' | 'email_taken';
  resetResult?: 'success';
} = {}) {
  await page.route(/supabase\.co\/auth\/v1\/token/, async (route) => {
    if (opts.signInResult === 'success') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_token',
          refresh_token: 'mock_refresh',
          user: { id: 'u1', email: 'test@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', role: 'authenticated', app_metadata: {}, user_metadata: {} },
        }),
      });
    }
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
    });
  });

  await page.route(/supabase\.co\/auth\/v1\/signup/, async (route) => {
    if (opts.signUpResult === 'email_taken') {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User already registered', code: 'user_already_exists' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u2', email: 'new@example.com', email_confirmed_at: null, app_metadata: {}, user_metadata: {} },
        session: null,
      }),
    });
  });

  await page.route(/supabase\.co\/auth\/v1\/recover/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Stub profile fetch so auth redirect doesn't break
  await page.route(/supabase\.co\/rest\/v1\/profiles/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'u1', plan: 'free', subscription_status: null, referral_pro_until: null }]),
    });
  });
}

const baseInit = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('tsw_location_asked', '1');
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('tsw-onboarding-seen', '1');
    localStorage.setItem('language', 'en');
    sessionStorage.setItem('splash_shown', '1');
  });
};

test.describe('Auth flows', () => {
  test('login form renders all fields and submit button', async ({ page }) => {
    await baseInit(page);
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // The mode tab and the submit button are both labelled "Sign In" — scope to the form.
    await expect(page.locator('form').getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await baseInit(page);
    await stubSupabaseAuth(page, { signInResult: undefined });
    await page.goto('/auth');

    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('form').getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid login credentials/i)).toBeVisible({ timeout: 5_000 });
  });

  test('switching to signup mode shows full name field', async ({ page }) => {
    await baseInit(page);
    await page.goto('/auth');

    // The signup tab is labelled "Sign Up" (mode tabs sit above the form).
    await page.getByRole('button', { name: /sign up/i }).first().click();

    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('successful signup shows email confirmation screen', async ({ page }) => {
    await baseInit(page);
    await stubSupabaseAuth(page, { signUpResult: 'success' });
    await page.goto('/auth');

    await page.getByRole('button', { name: /sign up/i }).first().click();

    await page.locator('input[type="email"]').fill('new@example.com');
    await page.locator('input[type="password"]').fill('SecurePass123!');
    await page.getByLabel(/full name/i).fill('Test User');

    await page.locator('button[type="submit"]').click();

    // After successful signup → confirmation sent screen
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5_000 });
  });

  test('?verify=pending URL shows email verification prompt', async ({ page }) => {
    await baseInit(page);
    await page.goto('/auth?verify=pending');

    await expect(page.getByText(/check your email/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('forgot password mode shows email-only form', async ({ page }) => {
    await baseInit(page);
    await page.goto('/auth');

    await page.getByRole('button', { name: /forgot.*password/i }).click();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeHidden();
  });

  test('password reset submission shows confirmation', async ({ page }) => {
    await baseInit(page);
    await stubSupabaseAuth(page, { resetResult: 'success' });
    await page.goto('/auth');

    await page.getByRole('button', { name: /forgot.*password/i }).click();
    await page.locator('input[type="email"]').fill('user@example.com');
    await page.getByRole('button', { name: /send.*reset|reset.*password/i }).click();

    await expect(page.getByText(/check your email|sent/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
