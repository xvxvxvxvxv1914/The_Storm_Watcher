interface AuroraNight {
  date: Date;
  maxKp: number;
  label: string;
  cloudCoverAvg: number | null;
  isBest?: boolean;
}

const NIGHT_START_HOUR = 22; // 22:00 local
const NIGHT_END_HOUR = 2;    // 02:00 next day

function formatDateUTC(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildAuroraICS(nights: AuroraNight[], locationName: string): string {
  const now = formatDateUTC(new Date());
  const events: string[] = [];

  for (const night of nights) {
    if (night.maxKp < 3) continue; // skip quiet nights

    const start = new Date(night.date);
    start.setHours(NIGHT_START_HOUR, 0, 0, 0);
    const end = new Date(night.date);
    end.setDate(end.getDate() + 1);
    end.setHours(NIGHT_END_HOUR, 0, 0, 0);

    const gLevel = night.maxKp >= 9 ? 'G5 Extreme'
      : night.maxKp >= 8 ? 'G4 Severe'
      : night.maxKp >= 7 ? 'G3 Strong'
      : night.maxKp >= 6 ? 'G2 Moderate'
      : night.maxKp >= 5 ? 'G1 Minor Storm'
      : 'Active';

    const cloudInfo = night.cloudCoverAvg != null
      ? `Cloud cover: ${Math.round(night.cloudCoverAvg)}%`
      : 'Cloud cover: unknown';

    const summary = `${night.isBest ? '★ ' : ''}Aurora ${gLevel} (Kp ${night.maxKp.toFixed(1)})`;
    const description = [
      `Predicted maximum Kp: ${night.maxKp.toFixed(1)}`,
      `Storm level: ${gLevel}`,
      cloudInfo,
      locationName ? `Location: ${locationName}` : '',
      '',
      'Best viewing: 22:00–02:00 local. Find dark skies away from city lights.',
      '',
      'Forecast from The Storm Watcher · https://thestormwatcher.com/calendar',
    ].filter(Boolean).join('\n');

    const uid = `aurora-${night.date.toISOString().slice(0, 10)}@thestormwatcher.com`;

    events.push([
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatDateUTC(start)}`,
      `DTEND:${formatDateUTC(end)}`,
      `SUMMARY:${escapeICalText(summary)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      locationName ? `LOCATION:${escapeICalText(locationName)}` : '',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Aurora forecast — check the sky tonight',
      'TRIGGER:-PT2H',
      'END:VALARM',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'));
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Storm Watcher//Aurora Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Aurora Calendar',
    'X-WR-CALDESC:Aurora viewing nights — Kp ≥ 3',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(ics: string, filename = 'aurora-calendar.ics'): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
