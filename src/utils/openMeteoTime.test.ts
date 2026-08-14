import { describe, it, expect } from 'vitest';
import {
  parseOpenMeteoTime,
  openMeteoHour,
  locationHourNow,
  parseOpenMeteoDay,
} from './openMeteoTime';

/**
 * The whole point of these is to be independent of the machine's zone, so the
 * assertions are on absolute instants (epoch / toISOString) rather than on
 * anything `getHours()` would answer. The suite runs green under UTC,
 * Europe/Sofia, America/New_York, Pacific/Auckland, Asia/Kathmandu,
 * Pacific/Chatham and America/Anchorage — the last three because 45-minute and
 * negative offsets are what naive arithmetic gets wrong.
 */
describe('parseOpenMeteoTime', () => {
  // Tromsø, 2026-08-14: the live API answers "2026-08-14T21:56" with
  // utc_offset_seconds 7200, which is 19:56 UTC.
  it('applies the response offset instead of the device zone', () => {
    expect(parseOpenMeteoTime('2026-08-14T21:56', 7200).toISOString())
      .toBe('2026-08-14T19:56:00.000Z');
  });

  it('handles offsets west of Greenwich', () => {
    // Anchorage, UTC-8 (AKDT): 21:56 local is 05:56 UTC the next day.
    expect(parseOpenMeteoTime('2026-08-14T21:56', -8 * 3600).toISOString())
      .toBe('2026-08-15T05:56:00.000Z');
  });

  it('handles the 45-minute zones, which round arithmetic gets wrong', () => {
    // Kathmandu +5:45 and Chatham +12:45 are the classic breakers.
    expect(parseOpenMeteoTime('2026-08-14T21:56', 345 * 60).toISOString())
      .toBe('2026-08-14T16:11:00.000Z');
    expect(parseOpenMeteoTime('2026-08-14T21:56', 765 * 60).toISOString())
      .toBe('2026-08-14T09:11:00.000Z');
  });

  it('agrees with the naked constructor only when the zones match', () => {
    // This is the regression itself, stated as a test: the old reading is right
    // for a visitor standing in the same zone and wrong for everyone else.
    const naive = '2026-08-14T21:56';
    const deviceOffsetMin = -new Date(`${naive}:00`).getTimezoneOffset();
    const asDevice = new Date(naive).getTime();
    const correct = parseOpenMeteoTime(naive, deviceOffsetMin * 60).getTime();
    expect(asDevice).toBe(correct);

    // ...and a location two hours further east is off by exactly two hours.
    const twoEast = parseOpenMeteoTime(naive, (deviceOffsetMin + 120) * 60).getTime();
    expect(asDevice - twoEast).toBe(2 * 3600 * 1000);
  });
});

describe('openMeteoHour', () => {
  it('reads the hour on the clock at the location', () => {
    expect(openMeteoHour('2026-08-14T21:56')).toBe(21);
    expect(openMeteoHour('2026-08-14T00:00')).toBe(0);
    expect(openMeteoHour('2026-08-14T09:30')).toBe(9);
  });
});

describe('locationHourNow', () => {
  it('answers in the location zone, not the device one', () => {
    const noon = Date.parse('2026-08-14T12:00:00Z');
    expect(locationHourNow(0, noon)).toBe(12);
    expect(locationHourNow(3 * 3600, noon)).toBe(15);
    expect(locationHourNow(-8 * 3600, noon)).toBe(4);
  });

  it('wraps across midnight in both directions', () => {
    expect(locationHourNow(13 * 3600, Date.parse('2026-08-14T23:00:00Z'))).toBe(12);
    expect(locationHourNow(-11 * 3600, Date.parse('2026-08-14T02:00:00Z'))).toBe(15);
  });

  it('floors the 45-minute zones to the hour that is actually showing', () => {
    // 12:00 UTC in Kathmandu is 17:45 — the seventeenth hour, not the eighteenth.
    expect(locationHourNow(345 * 60, Date.parse('2026-08-14T12:00:00Z'))).toBe(17);
  });
});

describe('parseOpenMeteoDay', () => {
  it('keeps the label on the day the API meant', () => {
    // Date-only strings parse as UTC midnight, which renders as the day before
    // anywhere west of Greenwich.
    const d = parseOpenMeteoDay('2026-08-14');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(14);
  });
});
