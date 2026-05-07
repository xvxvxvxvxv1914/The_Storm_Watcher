const HHMM: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const MON_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const WEEKDAY_LONG: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
const WEEKDAY_SHORT: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

export const fmtHHMM = (d: Date) => d.toLocaleTimeString(undefined, HHMM);
export const fmtTime = (d: Date) => d.toLocaleTimeString();
export const fmtMonDay = (d: Date, locale = 'en') => d.toLocaleDateString(locale, MON_DAY);
export const fmtDateTime = (d: Date) => d.toLocaleString();
export const fmtWeekdayLong = (d: Date) => d.toLocaleDateString(undefined, WEEKDAY_LONG);
export const fmtWeekdayShort = (d: Date) => d.toLocaleDateString(undefined, WEEKDAY_SHORT);
