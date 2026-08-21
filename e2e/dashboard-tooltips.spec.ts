import { test, expect } from '@playwright/test';
import { stubNoaa } from './fixtures/noaa';

/**
 * The Dashboard info tooltips must open fully on screen.
 *
 * Phone width is the whole point of this file. At 430px the card grid is two
 * columns of ~195px and the tooltip panel is 224px, so a panel positioned
 * inside its own card cannot fit — the left column's text used to hang off the
 * left edge of the screen, unreadable.
 *
 * The panel is therefore portalled to <body> and positioned `fixed`, clamped to
 * the viewport. Both halves of that are load-bearing and neither is obvious
 * from reading the CSS, which is why this is an e2e test and not a unit test:
 * happy-dom does no layout, so only a real engine can tell you where the panel
 * landed. `hover:scale-105` leaves each card with `transform: matrix(1,0,0,1,0,0)`
 * — identity, but not `none` — which makes the card a containing block for
 * fixed descendants. Drop the portal and the panel resolves against the card
 * instead of the viewport and lands hundreds of px off-screen; both failures
 * are caught below as "outside the viewport".
 */

// iPhone 15 Pro Max. hasTouch so tap() dispatches real touch-derived pointer
// events, which is the branch the phone actually takes.
test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

test.describe('Dashboard info tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await stubNoaa(page);
    await page.addInitScript(() => {
      localStorage.setItem('tsw-onboarding-seen', '1');
      localStorage.setItem('language', 'en');
      // LocationPrompt (z-[200]) and CookieConsent would sit over the cards.
      localStorage.setItem('tsw_location_asked', '1');
      localStorage.setItem('cookie-consent', 'accepted');
      sessionStorage.setItem('splash_shown', '1');
    });
  });

  test('every tooltip opens fully inside the viewport, in both columns', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-tour="kp-card"]')).toBeVisible();

    // `cursor-help` is unique to InfoTooltip and, unlike the labels, does not
    // change with the UI language.
    const buttons = page.locator('[role="button"].cursor-help');
    await expect(buttons.first()).toBeVisible();
    const count = await buttons.count();
    expect(count).toBe(5);

    // Nothing on screen until asked: the panel mounts on open. Worth asserting
    // on its own — the implementation this test replaced kept all five in the
    // DOM at opacity-0, and saying so here turns that regression into a plain
    // "expected 0, received 5" instead of an ambiguous-locator error.
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);

    const viewport = page.viewportSize()!;
    const columns = new Set<string>();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      await button.scrollIntoViewIfNeeded();

      const anchor = await button.boundingBox();
      expect(anchor, `info button #${i} has no box`).not.toBeNull();
      columns.add(anchor!.x < viewport.width / 2 ? 'left' : 'right');

      await button.tap();

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip, `tooltip #${i} did not open`).toBeVisible();

      const box = await tooltip.boundingBox();
      expect(box, `tooltip #${i} has no box`).not.toBeNull();
      const { x, y, width, height } = box!;
      const where = `tooltip #${i} at x=${x}..${x + width} y=${y}..${y + height}`;

      expect(x, `${where} starts off the left edge`).toBeGreaterThanOrEqual(0);
      expect(y, `${where} starts above the viewport`).toBeGreaterThanOrEqual(0);
      expect(x + width, `${where} runs past the right edge`).toBeLessThanOrEqual(viewport.width);
      expect(y + height, `${where} runs past the bottom edge`).toBeLessThanOrEqual(viewport.height);

      // ...and the panel must not be clipping its own text either.
      const clipped = await tooltip.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
      );
      expect(clipped, `${where} clips its own text`).toBe(false);

      // Tapping away closes it, so the next iteration starts clean.
      await page.touchscreen.tap(5, viewport.height - 5);
      await expect(tooltip).toHaveCount(0);
    }

    // A pass that only ever exercised the right column would prove nothing:
    // the left column is the one that used to run off the screen.
    expect(Array.from(columns).sort()).toEqual(['left', 'right']);
  });
});
