import * as idb from './idb';
import { newId } from './id';
import { groupBy } from './stats';
import { userId } from './pb';
import {
  COLLECTIONS,
  type CollectionName,
  type Collections,
  type Day,
  type DayKind,
  type Exercise,
  type PlanItem,
  type Session,
  type Settings,
  type WorkSet,
} from './types';

// Reactive in-memory copy of the local IndexedDB mirror. All screens read from here;
// all writes go through save()/remove(), which persist locally and queue a sync.

class Store {
  exercises = $state.raw<Exercise[]>([]);
  days = $state.raw<Day[]>([]);
  plan_items = $state.raw<PlanItem[]>([]);
  sessions = $state.raw<Session[]>([]);
  sets = $state.raw<WorkSet[]>([]);
  settings = $state.raw<Settings[]>([]);
  loaded = $state(false);

  exerciseById = $derived(new Map(this.exercises.map((e) => [e.id, e])));
  sessionById = $derived(new Map(this.sessions.map((s) => [s.id, s])));
  setsByExercise = $derived(groupBy(this.sets, (s) => s.exercise));
  setsBySession = $derived(groupBy(this.sets, (s) => s.session));
  dayByWeekday = $derived(new Map(this.days.map((d) => [d.weekday, d])));

  /** The session currently in progress, if any. */
  active = $derived(
    this.sessions.filter((s) => !s.finished).sort((a, b) => b.started - a.started)[0] ?? null,
  );

  /** Finished sessions, newest first. */
  finished = $derived(
    this.sessions.filter((s) => s.finished).sort((a, b) => b.started - a.started),
  );

  prefs = $derived<{ rest_seconds: number; increment: number }>({
    rest_seconds: this.settings[0]?.rest_seconds || 120,
    increment: this.settings[0]?.increment || 2.5,
  });
}

export const store = new Store();

/** Called by the sync engine; ids touched since `since` must not be overwritten by a pull. */
const touched = new Map<string, number>();
export function touchedSince(since: number): Set<string> {
  return new Set([...touched].filter(([, t]) => t >= since).map(([id]) => id));
}

let onChange: () => void = () => {};
export function setChangeListener(fn: () => void) {
  onChange = fn;
}

export async function loadLocal(): Promise<void> {
  const all = await Promise.all(COLLECTIONS.map((c) => idb.getAll(c)));
  COLLECTIONS.forEach((c, i) => setCollection(c, all[i] as never));
  store.loaded = true;
}

export function setCollection<C extends CollectionName>(c: C, recs: Collections[C][]) {
  (store as unknown as Record<CollectionName, Collections[C][]>)[c] = recs;
}

function list<C extends CollectionName>(c: C): Collections[C][] {
  return (store as unknown as Record<CollectionName, Collections[C][]>)[c];
}

export async function save<C extends CollectionName>(c: C, rec: Collections[C]): Promise<void> {
  const cur = list(c);
  const i = cur.findIndex((r) => r.id === rec.id);
  setCollection(c, i >= 0 ? cur.map((r, j) => (j === i ? rec : r)) : [...cur, rec]);
  touched.set(rec.id, Date.now());
  const plain = $state.snapshot(rec) as Record<string, unknown>;
  await idb.put(c, plain);
  await idb.enqueue({ collection: c, id: rec.id, op: 'upsert', data: plain });
  onChange();
}

export async function patch<C extends CollectionName>(
  c: C,
  id: string,
  changes: Partial<Collections[C]>,
): Promise<void> {
  const cur = list(c).find((r) => r.id === id);
  if (cur) await save(c, { ...cur, ...changes });
}

export async function remove(c: CollectionName, id: string): Promise<void> {
  setCollection(c, list(c).filter((r) => r.id !== id));
  touched.set(id, Date.now());
  await idb.del(c, id);
  await idb.enqueue({ collection: c, id, op: 'delete' });
  onChange();
}

export async function resetLocal(): Promise<void> {
  await idb.clearAll();
  for (const c of COLLECTIONS) setCollection(c, []);
}

// ---------- domain helpers ----------

export function exerciseIncrement(exId: string): number {
  return store.exerciseById.get(exId)?.increment || store.prefs.increment;
}

export function planFor(dayId: string): PlanItem[] {
  return store.plan_items
    .filter((p) => p.day === dayId)
    .sort((a, b) => a.position - b.position);
}

export const DEFAULT_SCHEDULE: [string, DayKind][] = [
  ['Push', 'strength'],
  ['Pull', 'strength'],
  ['Legs', 'strength'],
  ['Cardio · Norwegian 4×4', 'cardio'],
  ['Upper', 'strength'],
  ['Lower', 'strength'],
  ['Rust', 'rest'],
];

/** Create the default week schedule and settings if they do not exist yet. */
export async function seedDefaults(): Promise<void> {
  const user = userId();
  for (let wd = 1; wd <= 7; wd++) {
    if (store.dayByWeekday.has(wd)) continue;
    const [name, kind] = DEFAULT_SCHEDULE[wd - 1];
    await save('days', { id: newId(), user, weekday: wd, name, kind });
  }
  if (!store.settings.length) {
    await save('settings', { id: newId(), user, rest_seconds: 120, increment: 2.5 });
  }
}

export async function startSession(day: Day, date: string): Promise<Session> {
  const s: Session = {
    id: newId(),
    user: userId(),
    day: day.id,
    date,
    day_name: day.name,
    kind: day.kind,
    started: Date.now(),
    finished: 0,
    note: '',
    cardio_done: false,
    avg_hr: 0,
  };
  await save('sessions', s);
  return s;
}

export async function logSet(session: Session, exercise: string, weight: number, reps: number): Promise<WorkSet> {
  const existing = (store.setsBySession.get(session.id) ?? []).filter((s) => s.exercise === exercise);
  const set: WorkSet = {
    id: newId(),
    user: userId(),
    session: session.id,
    exercise,
    idx: existing.length ? Math.max(...existing.map((s) => s.idx)) + 1 : 0,
    weight,
    reps,
    at: Date.now(),
  };
  await save('sets', set);
  return set;
}

export async function deleteSession(id: string): Promise<void> {
  for (const s of store.setsBySession.get(id) ?? []) await remove('sets', s.id);
  await remove('sessions', id);
}

export async function createExercise(name: string): Promise<Exercise> {
  const ex: Exercise = { id: newId(), user: userId(), name: name.trim(), increment: 0, archived: false };
  await save('exercises', ex);
  return ex;
}
