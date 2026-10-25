import { describe, expect, it } from 'vitest';
import { stableId } from './id';
import { hitTarget, proposals, raiseStep, type ProgressInput } from './progress';
import type { Exercise, PlanItem, Session, Skill, WorkSet } from './types';

let n = 0;
const set = (session: string, exercise: string, reps: number, weight = 0): WorkSet => ({
  id: `w${++n}`, user: 'u', session, exercise, idx: n, weight, reps, at: n,
});
const sess = (id: string, started: number, day = 'd1', finished = started + 1): Session => ({
  id, user: 'u', day, date: '2026-10-13', day_name: 'Push', kind: 'strength', started, finished, note: '', cardio_done: false, avg_hr: 0,
});
const ex = (id: string, extra: Partial<Exercise> = {}): Exercise => ({
  id, user: 'u', name: id, increment: 0, archived: false, measure: 'seconds', progress: false, next: '', default_sets: 0, default_target: 0, cue: '', ...extra,
});
const item = (exercise: string, target_sets: number, target_reps: number, day = 'd1'): PlanItem => ({
  id: 'p-' + exercise, user: 'u', day, exercise, position: 0, target_sets, target_reps, note: '', rest_seconds: 0,
});
const skill = (exercise: string, goal: number, extra: Partial<Skill> = {}): Skill => ({
  id: 'sk-' + exercise, user: 'u', name: exercise, tier: 1, position: 0, exercise, goal, achieved_at: 0, note: '', ...extra,
});

function input(o: {
  items?: PlanItem[];
  exercises: Exercise[];
  skills?: Skill[];
  sets: WorkSet[];
  sessions: Session[];
  dismissed?: string[];
}): ProgressInput {
  const setsByExercise = new Map<string, WorkSet[]>();
  for (const s of o.sets) setsByExercise.set(s.exercise, [...(setsByExercise.get(s.exercise) ?? []), s]);
  return {
    planItems: o.items ?? [],
    exercises: new Map(o.exercises.map((e) => [e.id, e])),
    skills: o.skills ?? [],
    setsByExercise,
    sessionsById: new Map(o.sessions.map((s) => [s.id, s])),
    dismissed: new Set(o.dismissed ?? []),
  };
}

const three = (session: string, exercise: string, ...reps: number[]) => reps.map((r) => set(session, exercise, r));

describe('hitTarget', () => {
  it('needs enough sets at or above target', () => {
    expect(hitTarget(three('a', 'e', 10, 10, 12), 3, 10)).toBe(true);
    expect(hitTarget(three('a', 'e', 10, 9, 12), 3, 10)).toBe(false);
  });
  it('ignores items without a target', () => {
    expect(hitTarget(three('a', 'e', 10), 1, 0)).toBe(false);
  });
});

describe('raiseStep', () => {
  it('scales with measure', () => {
    expect(raiseStep(8, 'reps')).toBe(1);
    expect(raiseStep(10, 'seconds')).toBe(2);
    expect(raiseStep(45, 'seconds')).toBe(5);
    expect(raiseStep(30, 'minutes')).toBe(5);
  });
});

describe('proposals', () => {
  const lsit = ex('tuck-lsit', { next: 'one-leg-lsit' });
  const oneLeg = ex('one-leg-lsit', { default_sets: 4, default_target: 8 });
  const sessions = [sess('s1', 1), sess('s2', 2)];

  it('proposes the next exercise after two sessions in a row', () => {
    const p = proposals(input({
      items: [item('tuck-lsit', 3, 10)],
      exercises: [lsit, oneLeg],
      sets: [...three('s1', 'tuck-lsit', 10, 10, 11), ...three('s2', 'tuck-lsit', 12, 10, 10)],
      sessions,
    }));
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ kind: 'swap', key: 'swap:p-tuck-lsit:s2', sets: 4, target: 8 });
  });

  it('does nothing after only one good session', () => {
    const p = proposals(input({
      items: [item('tuck-lsit', 3, 10)],
      exercises: [lsit, oneLeg],
      sets: [...three('s1', 'tuck-lsit', 8, 8, 8), ...three('s2', 'tuck-lsit', 12, 10, 10)],
      sessions,
    }));
    expect(p).toHaveLength(0);
  });

  it('ignores a session that is still in progress', () => {
    const p = proposals(input({
      items: [item('tuck-lsit', 3, 10)],
      exercises: [lsit, oneLeg],
      sets: [...three('s1', 'tuck-lsit', 10, 10, 10), ...three('s2', 'tuck-lsit', 10, 10, 10)],
      sessions: [sess('s1', 1), sess('s2', 2, 'd1', 0)],
    }));
    expect(p).toHaveLength(0);
  });

  it('only counts sessions of the same schedule day', () => {
    const p = proposals(input({
      items: [item('tuck-lsit', 3, 10)],
      exercises: [lsit, oneLeg],
      sets: [...three('s1', 'tuck-lsit', 10, 10, 10), ...three('s2', 'tuck-lsit', 10, 10, 10)],
      sessions: [sess('s1', 1), sess('s2', 2, 'other-day')],
    }));
    expect(p).toHaveLength(0);
  });

  it('raises the target for progress exercises without a next step', () => {
    const pull = ex('pullups', { measure: 'reps', progress: true });
    const p = proposals(input({
      items: [item('pullups', 3, 6)],
      exercises: [pull],
      sets: [...three('s1', 'pullups', 6, 6, 6), ...three('s2', 'pullups', 7, 6, 6)],
      sessions,
    }));
    expect(p[0]).toMatchObject({ kind: 'raise', from: 6, to: 7 });
  });

  it('leaves weighted work to the overload hint', () => {
    const dips = ex('dips', { measure: 'reps', progress: true });
    const p = proposals(input({
      items: [item('dips', 1, 7)],
      exercises: [dips],
      sets: [set('s1', 'dips', 7, 10), set('s2', 'dips', 7, 10)],
      sessions,
    }));
    expect(p).toHaveLength(0);
  });

  it('respects dismissals', () => {
    const pull = ex('pullups', { measure: 'reps', progress: true });
    const p = proposals(input({
      items: [item('pullups', 1, 6)],
      exercises: [pull],
      sets: [set('s1', 'pullups', 6), set('s2', 'pullups', 6)],
      sessions,
      dismissed: ['raise:p-pullups:s2'],
    }));
    expect(p).toHaveLength(0);
  });

  it('proposes checking off a skill when the best set hit the goal twice', () => {
    const elbow = ex('elbow');
    const p = proposals(input({
      exercises: [elbow],
      skills: [skill('elbow', 12)],
      sets: [set('s1', 'elbow', 8), set('s1', 'elbow', 12), set('s2', 'elbow', 13)],
      sessions,
    }));
    expect(p).toEqual([expect.objectContaining({ kind: 'skill', best: 13, key: 'skill:sk-elbow:s2' })]);
  });

  it('skips skills that are already achieved', () => {
    const p = proposals(input({
      exercises: [ex('elbow')],
      skills: [skill('elbow', 12, { achieved_at: 5 })],
      sets: [set('s1', 'elbow', 12), set('s2', 'elbow', 13)],
      sessions,
    }));
    expect(p).toHaveLength(0);
  });
});

describe('stableId', () => {
  it('is deterministic and PocketBase-shaped', () => {
    const a = stableId('u', 'ex', 'pull-ups');
    expect(a).toBe(stableId('u', 'ex', 'pull-ups'));
    expect(a).not.toBe(stableId('u', 'ex', 'dips'));
    expect(a).toMatch(/^[a-z0-9]{15}$/);
  });
});

import { carryOver } from './progress';

describe('carryOver', () => {
  const exs = new Map(
    [
      ex('tuck', { next: 'one' }),
      ex('one', { next: 'full' }),
      ex('full'),
      ex('pull', { measure: 'reps' }),
      ex('hs'),
    ].map((e) => [e.id, e]),
  );
  it('keeps a later ladder step from the old plan', () => {
    expect(carryOver('tuck', 4, 10, [item('one', 3, 8)], exs)).toEqual({ exercise: 'one', sets: 3, target: 8 });
  });
  it('keeps a raised target', () => {
    expect(carryOver('pull', 5, 6, [item('pull', 5, 7)], exs)).toEqual({ exercise: 'pull', sets: 5, target: 7 });
  });
  it('uses the program when nothing was progressed', () => {
    expect(carryOver('pull', 5, 6, [item('pull', 5, 5)], exs)).toEqual({ exercise: 'pull', sets: 5, target: 6 });
    expect(carryOver('pull', 5, 6, [], exs)).toEqual({ exercise: 'pull', sets: 5, target: 6 });
  });
  it('keeps "no target" items as attempts', () => {
    expect(carryOver('hs', 6, 0, [item('hs', 8, 0)], exs)).toEqual({ exercise: 'hs', sets: 6, target: 0 });
  });
});
