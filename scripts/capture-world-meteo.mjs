import { writeFileSync } from 'fs';

const CITIES = [
  ['Chatham',    -43.95, -176.55],  // +12:45
  ['Auckland',   -36.85,  174.76],  // +12
  ['Tokyo',       35.68,  139.69],  // +9
  ['Kathmandu',   27.72,   85.32],  // +5:45
  ['Sofia',       42.70,   23.32],  // +3
  ['Tromso',      69.65,   18.96],  // +2, near-polar
  ['CapeTown',   -33.93,   18.42],  // +2, southern
  ['Reykjavik',   64.15,  -21.94],  // +0
  ['Ushuaia',    -54.80,  -68.30],  // -3, far south
  ['NewYork',     40.71,  -74.01],  // -4
  ['Anchorage',   61.22, -149.90],  // -8
  ['Honolulu',    21.31, -157.86],  // -10
];

const get = async (url) => {
  let last;
  for (let i = 0; i < 6; i++) {
    try { return await (await fetch(url)).json(); }
    catch (e) { last = e; await new Promise(r => setTimeout(r, 1500)); }
  }
  throw last;
};

const out = {};
for (const [name, lat, lon] of CITIES) {
  await new Promise(r => setTimeout(r, 1200));
  const sky = await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&hourly=cloud_cover,visibility,precipitation_probability&daily=sunrise,sunset&timezone=auto&forecast_days=4`);
  const uv = await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&hourly=uv_index&daily=uv_index_max&timezone=auto&forecast_days=1`);

  // Trim the hourly arrays: the tests only need the window around the first two
  // nights, and a committed fixture should stay readable.
  const keep = 60;
  out[name] = {
    lat, lon,
    timezone: sky.timezone,
    utc_offset_seconds: sky.utc_offset_seconds,
    daily: { time: sky.daily.time, sunrise: sky.daily.sunrise, sunset: sky.daily.sunset },
    hourly: {
      time: sky.hourly.time.slice(0, keep),
      cloud_cover: sky.hourly.cloud_cover.slice(0, keep),
      visibility: sky.hourly.visibility.slice(0, keep),
      precipitation_probability: sky.hourly.precipitation_probability.slice(0, keep),
    },
    uv: {
      timezone: uv.timezone,
      utc_offset_seconds: uv.utc_offset_seconds,
      hourly: uv.hourly,
      daily: uv.daily,
    },
  };
  console.log(name.padEnd(11), 'offset', String(sky.utc_offset_seconds / 3600).padStart(6),
    '| sunset[0]', sky.daily.sunset[0], '| tz', sky.timezone);
}

writeFileSync('captured.json', JSON.stringify(out, null, 2));
console.log('\ncaptured', Object.keys(out).length, 'cities');
