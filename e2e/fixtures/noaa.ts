import { Page } from '@playwright/test';

// All NOAA endpoints are stubbed so tests don't depend on the live feed.
// Open-Meteo (UV/sun) is not used on the Dashboard so we don't need to stub
// it for these paths.
export const stubNoaa = async (page: Page) => {
  // The app calls /api/gfz?start=…&end=… (query string, no path segment after gfz)
  await page.route(/\/api\/gfz(\?|\/|$)/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        datetime: ['2026-04-26T08:00:00Z'],
        Kp: [4.2],
      }),
    });
  });

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
