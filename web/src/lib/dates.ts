const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 1 = Monday … 7 = Sunday */
export function weekdayOf(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Monday of the week containing d, as YYYY-MM-DD. */
export function weekStart(d: Date): string {
  return isoDate(addDays(d, 1 - weekdayOf(d)));
}

export const WEEKDAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
export const WEEKDAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function weekdayName(n: number): string {
  return WEEKDAYS[n - 1] ?? '';
}

/** "Maandag 5 okt" */
export function longDate(d: Date): string {
  return `${weekdayName(weekdayOf(d))} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "5 okt" */
export function shortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
