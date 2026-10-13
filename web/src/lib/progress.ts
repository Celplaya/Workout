import { bestValue, groupBy } from './stats';
import type { Exercise, Measure, PlanItem, Session, Skill, WorkSet } from './types';

// Progression proposals. A goal counts as reached when it was hit in the last
// two sessions in a row (STREAK). The app then proposes the next step; you
// confirm it with one tap or wave it away with "Niet nu".

export const STREAK = 2;

export type Proposal =
  | {
      kind: 'swap';
      key: string;
      item: PlanItem;
      from: Exercise;
      to: Exercise;
      sets: number;
      target: number;
    }
  | {
      kind: 'raise';
      key: string;
      item: PlanItem;
      exercise: Exercise;
      from: number;
      to: number;
    }
  | {
      kind: 'skill';
      key: string;
      skill: Skill;
      best: number;
    };

export interface ProgressInput {
  planItems: PlanItem[];
  exercises: Map<string, Exercise>;
  skills: Skill[];
  setsByExercise: Map<string, WorkSet[]>;
  sessionsById: Map<string, Session>;
  dismissed: Set<string>;
}

/** Finished sessions in which these sets were logged, newest first, with their sets. */
export function performances(
  exerciseSets: WorkSet[],
  sessionsById: Map<string, Session>,
  filter: (s: Session) => boolean = () => true,
): { session: Session; sets: WorkSet[] }[] {
  const out: { session: Session; sets: WorkSet[] }[] = [];
  for (const [sid, sets] of groupBy(exerciseSets, (s) => s.session)) {
    const session = sessionsById.get(sid);
    if (session && session.finished && filter(session)) out.push({ session, sets });
  }
  return out.sort((a, b) => b.session.started - a.session.started);
}

/** Target reached: at least `targetSets` sets at or above `target`. */
export function hitTarget(sets: WorkSet[], targetSets: number, target: number): boolean {
  if (targetSets < 1 || target < 1) return false;
  return sets.filter((s) => s.reps >= target).length >= targetSets;
}

/** How much to raise a target that was reached. */
export function raiseStep(target: number, measure: Measure): number {
  if (measure === 'minutes') return 5;
  if (measure === 'seconds') return target < 30 ? 2 : 5;
  return 1;
}

export function proposals(input: ProgressInput): Proposal[] {
  const out: Proposal[] = [];

  for (const item of input.planItems) {
    const ex = input.exercises.get(item.exercise);
    if (!ex) continue;
    const perf = performances(input.setsByExercise.get(ex.id) ?? [], input.sessionsById, (s) => s.day === item.day);
    const recent = perf.slice(0, STREAK);
    if (recent.length < STREAK) continue;
    if (!recent.every((p) => hitTarget(p.sets, item.target_sets, item.target_reps))) continue;
    const latest = recent[0].session.id;

    const next = ex.next ? input.exercises.get(ex.next) : undefined;
    if (next) {
      const key = `swap:${item.id}:${latest}`;
      if (input.dismissed.has(key)) continue;
      out.push({
        kind: 'swap',
        key,
        item,
        from: ex,
        to: next,
        sets: next.default_sets || item.target_sets,
        target: next.default_target || item.target_reps,
      });
      continue;
    }

    // Weighted work already gets the "+2,5 kg" hint while logging.
    if (!ex.progress || recent.some((p) => p.sets.some((s) => s.weight > 0))) continue;
    const key = `raise:${item.id}:${latest}`;
    if (input.dismissed.has(key)) continue;
    const step = raiseStep(item.target_reps, ex.measure);
    out.push({ kind: 'raise', key, item, exercise: ex, from: item.target_reps, to: item.target_reps + step });
  }

  for (const skill of input.skills) {
    if (skill.achieved_at || !skill.exercise || !(skill.goal > 0)) continue;
    const perf = performances(input.setsByExercise.get(skill.exercise) ?? [], input.sessionsById);
    const recent = perf.slice(0, STREAK);
    if (recent.length < STREAK) continue;
    if (!recent.every((p) => bestValue(p.sets) >= skill.goal)) continue;
    const key = `skill:${skill.id}:${recent[0].session.id}`;
    if (input.dismissed.has(key)) continue;
    out.push({ kind: 'skill', key, skill, best: bestValue(recent[0].sets) });
  }

  // Skills first: they are the reason for all of this.
  const rank = { skill: 0, swap: 1, raise: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

/** Best single set ever for a skill's exercise (for the progress bar). */
export function skillBest(skill: Skill, setsByExercise: Map<string, WorkSet[]>): number {
  return skill.exercise ? bestValue(setsByExercise.get(skill.exercise) ?? []) : 0;
}
