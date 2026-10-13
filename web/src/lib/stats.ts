import { kg, unitOf } from './format';
import { parseDate, weekStart } from './dates';
import type { Measure, Session, WorkSet } from './types';

export type Trend = 'up' | 'same' | 'down';
export type PRKind = 'weight' | 'reps';

export const byIdx = (a: WorkSet, b: WorkSet) => a.idx - b.idx || a.at - b.at;

export function volumeOf(sets: WorkSet[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * Work done in a set of sets, for trends: kg × reps when weight is used,
 * otherwise the total reps (or seconds) — so bodyweight work and holds compare too.
 */
export function workOf(sets: WorkSet[]): number {
  return sets.some((s) => s.weight > 0) ? volumeOf(sets) : sets.reduce((n, s) => n + s.reps, 0);
}

/** Highest single-set value (reps or seconds). */
export function bestValue(sets: WorkSet[]): number {
  return sets.reduce((m, s) => Math.max(m, s.reps), 0);
}

export function trend(now: number, before: number): Trend {
  if (Math.abs(now - before) < 0.001) return 'same';
  return now > before ? 'up' : 'down';
}

export function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/**
 * Most recent earlier session (by start time) in which the exercise was done,
 * together with its sets in order.
 */
export function lastPerformance(
  exerciseSets: WorkSet[],
  sessionsById: Map<string, Session>,
  current?: Session,
): { session: Session; sets: WorkSet[] } | null {
  let best: Session | null = null;
  for (const s of exerciseSets) {
    if (current && s.session === current.id) continue;
    const sess = sessionsById.get(s.session);
    if (!sess) continue;
    if (current && sess.started >= current.started) continue;
    if (!best || sess.started > best.started) best = sess;
  }
  if (!best) return null;
  const id = best.id;
  return { session: best, sets: exerciseSets.filter((s) => s.session === id).sort(byIdx) };
}

/**
 * "3×8 @ 60 kg", "8/8/6 @ 60 kg", "60×8, 62,5×6", "3×12" (bodyweight),
 * "3×20 s" or "20/15/12 s" (holds).
 */
export function describeSets(sets: WorkSet[], measure: Measure = 'reps'): string {
  if (!sets.length) return '';
  const u = unitOf(measure);
  const weights = new Set(sets.map((s) => s.weight));
  if (weights.size === 1) {
    const w = sets[0].weight;
    const reps = sets.map((s) => s.reps);
    const allSame = reps.every((r) => r === reps[0]);
    const base = allSame ? `${sets.length}×${kg(reps[0])}` : reps.map(kg).join('/');
    const tail = u ? ` ${u}` : w > 0 || allSame ? '' : ' reps';
    return w > 0 ? `${base}${tail} @ ${kg(w)} kg` : `${base}${tail}`;
  }
  return sets.map((s) => `${kg(s.weight)}×${kg(s.reps)}${u ? ' ' + u : ''}`).join(', ');
}

/**
 * Progressive overload: if last time every target set at the top weight
 * reached the target reps, suggest the top weight + increment.
 */
export function overloadSuggestion(
  prev: WorkSet[],
  targetSets: number,
  targetReps: number,
  increment: number,
): number | null {
  if (!prev.length || targetSets < 1 || targetReps < 1 || increment <= 0) return null;
  const top = Math.max(...prev.map((s) => s.weight));
  if (top <= 0) return null;
  const topSets = prev.filter((s) => s.weight === top).sort(byIdx);
  if (topSets.length < targetSets) return null;
  if (!topSets.slice(0, targetSets).every((s) => s.reps >= targetReps)) return null;
  return Math.round((top + increment) * 100) / 100;
}

/** Values to pre-fill the steppers with for the next set. */
export function prefill(
  current: WorkSet[],
  prev: WorkSet[] | undefined,
  targetReps: number,
): { weight: number; reps: number } {
  const last = current.length ? [...current].sort(byIdx).at(-1)! : undefined;
  if (last) return { weight: last.weight, reps: last.reps };
  if (prev?.length) return { weight: prev[0].weight, reps: prev[0].reps };
  return { weight: 0, reps: targetReps > 0 ? targetReps : 8 };
}

/**
 * Personal record check for a set against everything logged before it.
 * `earlier` = all sets of this exercise logged before this one (any session).
 * Sets in the very first session of an exercise never count as PRs.
 */
export function prKind(
  set: { weight: number; reps: number; session: string },
  earlier: WorkSet[],
): PRKind | null {
  if (!earlier.some((s) => s.session !== set.session)) return null;
  const maxW = Math.max(...earlier.map((s) => s.weight));
  if (set.weight > maxW) return 'weight';
  const atW = earlier.filter((s) => s.weight === set.weight);
  if (atW.length && set.reps > Math.max(...atW.map((s) => s.reps))) return 'reps';
  return null;
}

/** PR kind for every set (by id) of one exercise, evaluated chronologically. */
export function prMap(exerciseSets: WorkSet[]): Map<string, PRKind> {
  const sorted = [...exerciseSets].sort((a, b) => a.at - b.at);
  const out = new Map<string, PRKind>();
  sorted.forEach((s, i) => {
    const k = prKind(s, sorted.slice(0, i));
    if (k) out.set(s.id, k);
  });
  return out;
}

export interface WeekPoint {
  week: string;
  best: number;
  volume: number;
  /** Highest reps/seconds in one set that week. */
  bestValue: number;
  /** Total reps/seconds that week. */
  total: number;
}

/** Best weight and total volume per week (Monday start) for one exercise. */
export function weeklySeries(exerciseSets: WorkSet[], sessionsById: Map<string, Session>): WeekPoint[] {
  const m = new Map<string, WeekPoint>();
  for (const s of exerciseSets) {
    const sess = sessionsById.get(s.session);
    if (!sess) continue;
    const week = weekStart(parseDate(sess.date));
    const p = m.get(week) ?? { week, best: 0, volume: 0, bestValue: 0, total: 0 };
    p.best = Math.max(p.best, s.weight);
    p.volume += s.weight * s.reps;
    p.bestValue = Math.max(p.bestValue, s.reps);
    p.total += s.reps;
    m.set(week, p);
  }
  return [...m.values()].sort((a, b) => a.week.localeCompare(b.week));
}
