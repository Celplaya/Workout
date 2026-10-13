import * as idb from './idb';
import { newId, stableId } from './id';
import { groupBy } from './stats';
import { userId } from './pb';
import { DAYS, EXERCISES, PROGRAM_ID, SKILLS } from './program';
import { proposals, type Proposal } from './progress';
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
  type Skill,
  type Dismissal,
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
  skills = $state.raw<Skill[]>([]);
  dismissals = $state.raw<Dismissal[]>([]);
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

  dismissed = $derived(new Set(this.dismissals.map((d) => d.key)));

  /** Pending progression proposals (skill reached, next step, higher target). */
  proposals = $derived<Proposal[]>(
    proposals({
      planItems: this.plan_items,
      exercises: this.exerciseById,
      skills: this.skills,
      setsByExercise: this.setsByExercise,
      sessionsById: this.sessionById,
      dismissed: this.dismissed,
    }),
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

export const DEFAULT_SCHEDULE: [string, DayKind][] = DAYS.map((d) => [d.name, d.kind]);

/** Create the default week schedule and settings if they do not exist yet. */
export async function seedDefaults(): Promise<void> {
  const user = userId();
  for (let wd = 1; wd <= 7; wd++) {
    if (store.dayByWeekday.has(wd)) continue;
    const [name, kind] = DEFAULT_SCHEDULE[wd - 1];
    await save('days', { id: newId(), user, weekday: wd, name, kind });
  }
  if (!store.settings.length) {
    await save('settings', { id: newId(), user, rest_seconds: 120, increment: 2.5, program: '' });
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

export async function createExercise(name: string, extra: Partial<Exercise> = {}): Promise<Exercise> {
  const ex: Exercise = {
    id: newId(),
    user: userId(),
    name: name.trim(),
    increment: 0,
    archived: false,
    measure: 'reps',
    progress: false,
    next: '',
    default_sets: 0,
    default_target: 0,
    cue: '',
    ...extra,
  };
  await save('exercises', ex);
  return ex;
}

/** Rest after a set of this plan item. */
export function restFor(item: PlanItem | undefined): number {
  return item?.rest_seconds || store.prefs.rest_seconds;
}

const slug = (name: string) => name.trim().toLowerCase();

/**
 * Load the calisthenics program once (per PROGRAM_ID): exercises with their
 * progression ladders, Monday–Sunday plan and the skills list. Existing
 * exercises are reused by name, so history stays attached. Ids are derived
 * from the content, so a second device doing the same just upserts.
 */
export async function applyProgram(): Promise<void> {
  const settings = store.settings[0];
  const user = userId();
  if (!settings || !user || settings.program === PROGRAM_ID) return;

  // 1. Exercises (first pass: create/update; second pass: link ladders).
  const byName = new Map(store.exercises.map((e) => [slug(e.name), e]));
  const resolved = new Map<string, Exercise>();
  for (const def of EXERCISES) {
    const cur = byName.get(slug(def.name));
    const rec: Exercise = {
      ...(cur ?? {
        id: stableId(user, 'ex', slug(def.name)),
        user,
        name: def.name,
        increment: 0,
        archived: false,
        next: '',
      }),
      archived: false,
      measure: def.measure,
      progress: !!def.progress,
      default_sets: def.sets ?? 0,
      default_target: def.target ?? 0,
      cue: def.cue ?? '',
    } as Exercise;
    resolved.set(slug(def.name), rec);
  }
  // Save every ladder's next step before the exercise pointing at it: the server
  // rejects a relation to a record it doesn't have yet (and the outbox sends in order).
  const nextOf = new Map(EXERCISES.map((d) => [slug(d.name), d.next ? slug(d.next) : '']));
  const saved = new Set<string>();
  const saveExercise = async (key: string): Promise<void> => {
    if (saved.has(key)) return;
    saved.add(key);
    const next = nextOf.get(key) ?? '';
    if (next && resolved.has(next)) await saveExercise(next);
    const rec = resolved.get(key)!;
    rec.next = next ? resolved.get(next)?.id ?? '' : '';
    await save('exercises', rec);
  };
  for (const def of EXERCISES) await saveExercise(slug(def.name));
  const exId = (name: string) => resolved.get(slug(name))!.id;

  // 2. Week schedule and plan.
  for (const [i, def] of DAYS.entries()) {
    const weekday = i + 1;
    const cur = store.dayByWeekday.get(weekday);
    const day: Day = cur
      ? { ...cur, name: def.name, kind: def.kind }
      : { id: stableId(user, 'day', weekday), user, weekday, name: def.name, kind: def.kind };
    await save('days', day);

    const items: PlanItem[] = def.items.map(([name, sets, target, note, rest], position) => ({
      id: stableId(user, PROGRAM_ID, weekday, position),
      user,
      day: day.id,
      exercise: exId(name),
      position,
      target_sets: sets,
      target_reps: target,
      note: note ?? '',
      rest_seconds: rest ?? 0,
    }));
    const keep = new Set(items.map((p) => p.id));
    for (const old of store.plan_items.filter((p) => p.day === day.id && !keep.has(p.id))) {
      await remove('plan_items', old.id);
    }
    for (const it of items) await save('plan_items', it);
  }

  // 3. Skills checklist.
  const now = Date.now();
  for (const [position, def] of SKILLS.entries()) {
    const id = stableId(user, 'skill', slug(def.name));
    if (store.skills.some((x) => x.id === id)) continue;
    await save('skills', {
      id,
      user,
      name: def.name,
      tier: def.tier === 0 ? 1 : def.tier,
      position,
      exercise: def.exercise ? exId(def.exercise) : '',
      goal: def.goal ?? 0,
      achieved_at: def.tier === 0 ? now : 0,
      note: def.note ?? '',
    });
  }

  await patch('settings', settings.id, { program: PROGRAM_ID });
}

// ---------- proposals ----------

async function dismissKey(key: string) {
  const user = userId();
  await save('dismissals', { id: stableId(user, 'dismiss', key), user, key });
}

/** "Niet nu": hide this proposal (it comes back after a newer session if still true). */
export async function dismissProposal(p: Proposal): Promise<void> {
  await dismissKey(p.key);
}

export async function acceptProposal(p: Proposal): Promise<void> {
  if (p.kind === 'skill') {
    await patch('skills', p.skill.id, { achieved_at: Date.now() });
  } else if (p.kind === 'swap') {
    if (p.to.archived) await patch('exercises', p.to.id, { archived: false });
    await patch('plan_items', p.item.id, {
      exercise: p.to.id,
      target_sets: p.sets,
      target_reps: p.target,
    });
  } else {
    await patch('plan_items', p.item.id, { target_reps: p.to });
  }
  await dismissKey(p.key);
}

export async function setSkillAchieved(skill: Skill, achieved: boolean): Promise<void> {
  await patch('skills', skill.id, { achieved_at: achieved ? Date.now() : 0 });
}
