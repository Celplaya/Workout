import { describe, expect, it } from 'vitest';
import { gearAdvice, gearProposals, haveKey, skipKey } from './gear';
import type { Exercise, Session, WorkSet } from './types';

const ex = (id: string, name: string): Exercise => ({
  id, user: 'u', name, increment: 0, archived: false, measure: 'reps', progress: true, next: '', default_sets: 0, default_target: 0, cue: '',
});
const exercises = [ex('rows', 'Bodyweight rows voeten verhoogd'), ex('pull', 'Pull-ups')];
const session: Session = {
  id: 's1', user: 'u', day: 'd', date: '2026-11-09', day_name: 'Upper A', kind: 'strength', started: 1, finished: 2, note: '', cardio_done: false, avg_hr: 0,
};
let n = 0;
const sets = (exercise: string, ...reps: number[]): WorkSet[] =>
  reps.map((r) => ({ id: `w${++n}`, user: 'u', session: 's1', exercise, idx: n, weight: 0, reps: r, at: n }));

const advice = (rows: number[], pulls: number[], dismissed: string[] = []) =>
  gearAdvice({
    exercises,
    setsByExercise: new Map([['rows', sets('rows', ...rows)], ['pull', sets('pull', ...pulls)]]),
    sessionsById: new Map([[session.id, session]]),
    dismissed: new Set(dismissed),
  });

describe('gearAdvice', () => {
  it('recommends parallettes now and the vest later', () => {
    const a = advice([10, 10, 9], [6, 6, 6, 6, 5]);
    expect(a.find((g) => g.id === 'parallettes')?.status).toBe('now');
    expect(a.find((g) => g.id === 'vest')).toMatchObject({ status: 'later' });
    expect(a.find((g) => g.id === 'box')?.status).toBe('no');
    expect(gearProposals(a, new Set()).map((g) => g.id)).toEqual(['parallettes']);
  });

  it('turns the vest on once rows reach 3×12 or pull-ups reach 10', () => {
    expect(advice([12, 12, 12], [6]).find((g) => g.id === 'vest')?.status).toBe('now');
    expect(advice([10, 10, 10], [10, 8]).find((g) => g.id === 'vest')?.status).toBe('now');
    expect(advice([12, 12, 11], [9]).find((g) => g.id === 'vest')?.status).toBe('later');
  });

  it('hides owned or skipped items from Vandaag', () => {
    const own = [haveKey('parallettes')];
    const a = advice([1], [1], own);
    expect(a.find((g) => g.id === 'parallettes')?.have).toBe(true);
    expect(gearProposals(a, new Set(own))).toEqual([]);
    expect(gearProposals(advice([1], [1]), new Set([skipKey('parallettes')]))).toEqual([]);
  });
});
