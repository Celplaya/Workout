import { describe, expect, it } from 'vitest';
import { describeSets, lastPerformance, overloadSuggestion, prKind, prMap, prefill, trend, volumeOf, weeklySeries } from './stats';
import type { Session, WorkSet } from './types';

let n = 0;
const set = (session: string, weight: number, reps: number, idx = 0, at = ++n): WorkSet => ({
  id: `s${at}`, user: 'u', session, exercise: 'e', idx, weight, reps, at,
});
const sess = (id: string, date: string, started: number): Session => ({
  id, user: 'u', day: 'd', date, day_name: 'Push', kind: 'strength', started, finished: started + 1, note: '', cardio_done: false, avg_hr: 0,
});

describe('describeSets', () => {
  it('formats uniform sets', () => {
    expect(describeSets([set('a', 60, 8), set('a', 60, 8), set('a', 60, 8)])).toBe('3×8 @ 60 kg');
  });
  it('formats varying reps at one weight', () => {
    expect(describeSets([set('a', 60, 8), set('a', 60, 8), set('a', 60, 6)])).toBe('8/8/6 @ 60 kg');
  });
  it('formats varying weights', () => {
    expect(describeSets([set('a', 60, 8), set('a', 62.5, 6)])).toBe('60×8, 62,5×6');
  });
  it('formats bodyweight', () => {
    expect(describeSets([set('a', 0, 12), set('a', 0, 12)])).toBe('2×12');
  });
});

describe('overloadSuggestion', () => {
  it('suggests increment when all target reps were hit', () => {
    expect(overloadSuggestion([set('a', 60, 8, 0), set('a', 60, 8, 1), set('a', 60, 9, 2)], 3, 8, 2.5)).toBe(62.5);
  });
  it('does not suggest when a set fell short', () => {
    expect(overloadSuggestion([set('a', 60, 8, 0), set('a', 60, 7, 1), set('a', 60, 8, 2)], 3, 8, 2.5)).toBeNull();
  });
  it('ignores lighter warm-up sets', () => {
    expect(overloadSuggestion([set('a', 40, 10, 0), set('a', 60, 8, 1), set('a', 60, 8, 2)], 2, 8, 2.5)).toBe(62.5);
  });
  it('needs enough sets', () => {
    expect(overloadSuggestion([set('a', 60, 8, 0)], 3, 8, 2.5)).toBeNull();
  });
});

describe('prefill', () => {
  it('uses last set of this session first', () => {
    expect(prefill([set('b', 62.5, 7, 0)], [set('a', 60, 8)], 8)).toEqual({ weight: 62.5, reps: 7 });
  });
  it('falls back to previous session', () => {
    expect(prefill([], [set('a', 60, 8)], 10)).toEqual({ weight: 60, reps: 8 });
  });
  it('falls back to target reps', () => {
    expect(prefill([], undefined, 10)).toEqual({ weight: 0, reps: 10 });
  });
});

describe('PRs', () => {
  it('no PR in first ever session', () => {
    expect(prKind({ weight: 100, reps: 5, session: 'a' }, [set('a', 90, 5)])).toBeNull();
  });
  it('detects heaviest weight', () => {
    expect(prKind({ weight: 65, reps: 5, session: 'b' }, [set('a', 60, 8)])).toBe('weight');
  });
  it('detects most reps at a weight', () => {
    expect(prKind({ weight: 60, reps: 9, session: 'b' }, [set('a', 60, 8), set('a', 62.5, 5)])).toBe('reps');
  });
  it('no PR when equal', () => {
    expect(prKind({ weight: 60, reps: 8, session: 'b' }, [set('a', 60, 8)])).toBeNull();
  });
  it('prMap does not repeat the same PR within a session', () => {
    const sets = [set('a', 60, 8), set('b', 65, 5), set('b', 65, 5)];
    const m = prMap(sets);
    expect([...m.values()]).toEqual(['weight']);
  });
});

describe('lastPerformance', () => {
  it('picks the most recent earlier session', () => {
    const s1 = sess('s1', '2026-09-28', 1000);
    const s2 = sess('s2', '2026-10-01', 2000);
    const cur = sess('s3', '2026-10-05', 3000);
    const sets = [set('s1', 55, 8), set('s2', 60, 8, 0), set('s2', 60, 8, 1), set('s3', 62.5, 8)];
    const r = lastPerformance(sets, new Map([s1, s2, cur].map((s) => [s.id, s])), cur);
    expect(r?.session.id).toBe('s2');
    expect(r?.sets.length).toBe(2);
  });
});

describe('aggregates', () => {
  it('volume and trend', () => {
    expect(volumeOf([set('a', 60, 8), set('a', 50, 10)])).toBe(980);
    expect(trend(10, 5)).toBe('up');
    expect(trend(5, 5)).toBe('same');
    expect(trend(4, 5)).toBe('down');
  });
  it('weekly series groups by Monday', () => {
    const s1 = sess('s1', '2026-10-05', 1); // Monday
    const s2 = sess('s2', '2026-10-11', 2); // Sunday same week
    const s3 = sess('s3', '2026-10-12', 3); // next Monday
    const map = new Map([s1, s2, s3].map((s) => [s.id, s]));
    const pts = weeklySeries([set('s1', 60, 8), set('s2', 65, 5), set('s3', 70, 3)], map);
    expect(pts).toEqual([
      { week: '2026-10-05', best: 65, volume: 805 },
      { week: '2026-10-12', best: 70, volume: 210 },
    ]);
  });
});
