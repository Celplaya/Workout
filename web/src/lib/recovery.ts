import { addDays, isoDate, parseDate, weekStart } from './dates';
import type { Activity, Daily } from './types';

// Recovery verdict and cardio progress, following the rules of the training
// plan (plan.ts): HRV balanced + decent sleep = train as planned, one off day =
// keep an eye on it, several off days or a raised resting heart rate on top of
// that = less load. The thresholds below are choices, not Garmin's.

export const RHR_RAISED = 5; // bpm above the 7-day average
export const SLEEP_SHORT = 360; // minutes
export const SLEEP_SCORE_LOW = 60;

export type Verdict = 'go' | 'watch' | 'reduce' | 'unknown';

export interface Recovery {
  verdict: Verdict;
  title: string;
  reasons: string[];
  /** The day the verdict is based on (today, or yesterday when today is not in yet). */
  day: Daily | null;
  /** Average resting heart rate of the 7 days before `day` (0 = unknown). */
  rhrBase: number;
  /** Days in a row (ending at `day`) with an HRV status other than balanced. */
  streak: number;
  stale: boolean;
}

const off = (d: Daily) => !!d.hrv_status && d.hrv_status.toUpperCase() !== 'BALANCED' && d.hrv_status.toUpperCase() !== 'NONE';

export const TITLES: Record<Verdict, string> = {
  go: 'Normaal trainen',
  watch: 'In de gaten houden',
  reduce: 'Belasting omlaag',
  unknown: 'Nog geen gegevens',
};

export function recovery(daily: Daily[], today = isoDate()): Recovery {
  const days = [...daily].filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const day = days[days.length - 1] ?? null;
  const yesterday = isoDate(addDays(parseDate(today), -1));
  if (!day || day.date < yesterday) {
    return { verdict: 'unknown', title: TITLES.unknown, reasons: [], day, rhrBase: 0, streak: 0, stale: true };
  }

  let streak = 0;
  for (let i = days.length - 1; i >= 0 && off(days[i]); i--) streak++;

  const before = days.slice(0, -1).slice(-7).filter((d) => d.resting_hr > 0);
  const rhrBase = before.length >= 3 ? Math.round(before.reduce((n, d) => n + d.resting_hr, 0) / before.length) : 0;
  const rhrRaised = rhrBase > 0 && day.resting_hr >= rhrBase + RHR_RAISED;
  const sleepPoor =
    (day.sleep_minutes > 0 && day.sleep_minutes < SLEEP_SHORT) || (day.sleep_score > 0 && day.sleep_score < SLEEP_SCORE_LOW);

  const reasons: string[] = [];
  if (streak >= 2) reasons.push(`HRV ${streak} dagen op rij uit balans`);
  else if (streak === 1) reasons.push('HRV vandaag uit balans');
  if (rhrRaised) reasons.push(`Rusthartslag ${day.resting_hr - rhrBase} slagen boven je gemiddelde`);
  if (sleepPoor) reasons.push(day.sleep_minutes && day.sleep_minutes < SLEEP_SHORT ? 'Kort geslapen' : 'Lage slaapscore');

  let verdict: Verdict = 'go';
  if (streak >= 2 || (rhrRaised && (streak >= 1 || sleepPoor))) verdict = 'reduce';
  else if (reasons.length) verdict = 'watch';
  if (verdict === 'go') {
    if (day.hrv_status) reasons.push('HRV in balans');
    if (day.sleep_minutes) reasons.push('Voldoende geslapen');
    if (rhrBase) reasons.push('Rusthartslag normaal');
  }
  return { verdict, title: TITLES[verdict], reasons, day, rhrBase, streak, stale: day.date !== today };
}

export const ADVICE: Record<Verdict, string> = {
  go: 'Train zoals gepland, met 1–2 herhalingen in reserve.',
  watch: 'Train gewoon, maar ga niet tot het gaatje en kijk morgen opnieuw.',
  reduce: 'Haal vandaag sets of intensiteit weg, of neem rust. Zone 2 rustig of overslaan.',
  unknown: 'Draag je horloge vannacht; de gegevens komen binnen na de volgende sync.',
};

// ---------- cardio ----------

export const isCardio = (a: Activity) =>
  a.minutes >= 10 && /walk|hik|cycl|bik|run|treadmill|elliptical|stair|row|swim|cardio/.test(a.type) && !/strength/.test(a.type);

/** The Zone 2 build-up from the plan. `sessions` and `minutes` are per week. */
export const BUILDUP = [
  { weeks: 'Week 1–2', sessions: 1, minutes: 20, duration: '20 min', incline: '3–5%' },
  { weeks: 'Week 3–4', sessions: 2, minutes: 35, duration: '20–25 + 15–20 min', incline: '5–7%' },
  { weeks: 'Week 5–6', sessions: 2, minutes: 45, duration: '25–30 + 20–25 min', incline: '6–8%' },
  { weeks: 'Week 7–8', sessions: 2, minutes: 50, duration: '30–40 + 20–25 min', incline: '8–10%' },
];

/** First Monday of the build-up: the week of the first cardio activity on or after this date. */
export const BUILDUP_FROM = '2026-11-16';

export interface CardioWeek {
  start: string;
  sessions: number;
  minutes: number;
  avgHr: number;
  /** Minutes in zone 2 and in all zones together (0 when the watch gave no zones). */
  zone2: number;
  zoned: number;
}

export function cardioWeeks(activities: Activity[], count = 8, today = new Date()): CardioWeek[] {
  const thisWeek = parseDate(weekStart(today));
  return Array.from({ length: count }, (_, i) => {
    const start = isoDate(addDays(thisWeek, (i - count + 1) * 7));
    const end = isoDate(addDays(parseDate(start), 6));
    const acts = activities.filter((a) => isCardio(a) && a.date >= start && a.date <= end);
    const withHr = acts.filter((a) => a.avg_hr > 0);
    const mins = withHr.reduce((n, a) => n + a.minutes, 0);
    return {
      start,
      sessions: acts.length,
      minutes: acts.reduce((n, a) => n + a.minutes, 0),
      avgHr: mins ? Math.round(withHr.reduce((n, a) => n + a.avg_hr * a.minutes, 0) / mins) : 0,
      zone2: acts.reduce((n, a) => n + (a.z2 ?? 0), 0),
      zoned: acts.reduce((n, a) => n + (a.z1 ?? 0) + (a.z2 ?? 0) + (a.z3 ?? 0) + (a.z4 ?? 0) + (a.z5 ?? 0), 0),
    };
  });
}

/** Index into BUILDUP for a date (-1 = not started yet, clamps at the last step). */
export function buildupStep(today = isoDate(), from = BUILDUP_FROM): number {
  const days = Math.round((parseDate(today).getTime() - parseDate(from).getTime()) / 86_400_000);
  if (days < 0) return -1;
  return Math.min(BUILDUP.length - 1, Math.floor(days / 14));
}

export function buildupWeek(today = isoDate(), from = BUILDUP_FROM): number {
  const days = Math.round((parseDate(today).getTime() - parseDate(from).getTime()) / 86_400_000);
  return days < 0 ? 0 : Math.floor(days / 7) + 1;
}
