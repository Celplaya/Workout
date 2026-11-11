import { describe, expect, it } from 'vitest';
import { buildupStep, buildupWeek, cardioWeeks, recovery } from './recovery';
import type { Activity, Daily } from './types';

const day = (date: string, o: Partial<Daily> = {}): Daily => ({
  id: date, user: 'u', date, resting_hr: 50, hrv: 60, hrv_weekly: 60, hrv_low: 52, hrv_high: 70, hrv_status: 'BALANCED',
  sleep_minutes: 450, sleep_score: 80, battery_high: 90, battery_low: 20, stress: 25, steps: 9000, vo2max: 48, readiness: 70, synced: 1, ...o,
});
const week = (o: Partial<Daily>[] = []) =>
  ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'].map((d, i) => day(d, o[i]));

describe('recovery', () => {
  it('says train normally when everything is in range', () => {
    const r = recovery(week(), '2026-11-11');
    expect(r.verdict).toBe('go');
    expect(r.rhrBase).toBe(50);
    expect(r.stale).toBe(false);
  });

  it('watches after one unbalanced day', () => {
    const r = recovery(week([{}, {}, {}, {}, {}, {}, { hrv_status: 'UNBALANCED' }]), '2026-11-11');
    expect(r).toMatchObject({ verdict: 'watch', streak: 1 });
  });

  it('reduces after several unbalanced days', () => {
    const r = recovery(week([{}, {}, {}, {}, {}, { hrv_status: 'LOW' }, { hrv_status: 'UNBALANCED' }]), '2026-11-11');
    expect(r).toMatchObject({ verdict: 'reduce', streak: 2 });
  });

  it('reduces when a raised resting heart rate comes with poor sleep', () => {
    const r = recovery(week([{}, {}, {}, {}, {}, {}, { resting_hr: 57, sleep_minutes: 300 }]), '2026-11-11');
    expect(r.verdict).toBe('reduce');
    expect(r.reasons.join(' ')).toMatch(/7 slagen/);
  });

  it('only watches a raised resting heart rate on its own', () => {
    expect(recovery(week([{}, {}, {}, {}, {}, {}, { resting_hr: 56 }]), '2026-11-11').verdict).toBe('watch');
  });

  it('uses yesterday when today is not in yet, and gives up on older data', () => {
    expect(recovery(week(), '2026-11-12')).toMatchObject({ verdict: 'go', stale: true });
    expect(recovery(week(), '2026-11-14').verdict).toBe('unknown');
    expect(recovery([], '2026-11-11').verdict).toBe('unknown');
  });
});

describe('cardio', () => {
  const act = (date: string, o: Partial<Activity> = {}): Activity => ({
    id: date + (o.type ?? ''), user: 'u', source: 'garmin', type: 'walking', name: '', date, start: 1, minutes: 20, avg_hr: 120, max_hr: 140, distance: 2000, calories: 100, ...o,
  });
  it('sums cardio per week and ignores strength', () => {
    const w = cardioWeeks(
      [act('2026-11-09', { z2: 15, z1: 5 }), act('2026-11-11', { minutes: 30, avg_hr: 130 }), act('2026-11-10', { type: 'strength_training', minutes: 60 }), act('2026-11-02')],
      2,
      new Date(2026, 10, 11),
    );
    expect(w.map((x) => [x.start, x.sessions, x.minutes])).toEqual([['2026-11-02', 1, 20], ['2026-11-09', 2, 50]]);
    expect(w[1].avgHr).toBe(126);
    expect(w[1]).toMatchObject({ zone2: 15, zoned: 20 });
  });
  it('knows where the build-up is', () => {
    expect(buildupStep('2026-11-11')).toBe(-1);
    expect(buildupStep('2026-11-16')).toBe(0);
    expect(buildupStep('2026-11-30')).toBe(1);
    expect(buildupStep('2027-03-01')).toBe(3);
    expect(buildupWeek('2026-11-24')).toBe(2);
  });
});
