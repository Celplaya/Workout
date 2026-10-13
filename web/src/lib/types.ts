export type DayKind = 'strength' | 'cardio' | 'rest';

/** What a set's `reps` value means. Empty = repetitions (older records). */
export type Measure = 'reps' | 'seconds' | 'minutes' | '';

export interface Base {
  id: string;
  user: string;
}

export interface Exercise extends Base {
  name: string;
  /** Weight step in kg for steppers and overload hints (0 = use default). */
  increment: number;
  archived: boolean;
  measure: Measure;
  /** Suggest a higher target once the current one is reached twice in a row. */
  progress: boolean;
  /** Next exercise in the progression ladder ('' = none). */
  next: string;
  /** Target to start this exercise at when it replaces its predecessor. */
  default_sets: number;
  default_target: number;
  /** Short coaching cue shown while logging. */
  cue: string;
}

export interface Day extends Base {
  /** 1 = Monday … 7 = Sunday */
  weekday: number;
  name: string;
  kind: DayKind;
}

export interface PlanItem extends Base {
  day: string;
  exercise: string;
  position: number;
  target_sets: number;
  /** Target per set in the exercise's measure (reps, seconds or minutes). 0 = no target. */
  target_reps: number;
  note: string;
  /** Rest after a set; 0 = the default from Settings. */
  rest_seconds: number;
}

export interface Session extends Base {
  day: string;
  /** Local date YYYY-MM-DD */
  date: string;
  day_name: string;
  kind: DayKind;
  /** epoch ms */
  started: number;
  /** epoch ms, 0 while the session is in progress */
  finished: number;
  note: string;
  cardio_done: boolean;
  avg_hr: number;
}

export interface WorkSet extends Base {
  session: string;
  exercise: string;
  idx: number;
  weight: number;
  /** Repetitions, or seconds/minutes for holds (see Exercise.measure). */
  reps: number;
  at: number;
}

export interface Settings extends Base {
  rest_seconds: number;
  increment: number;
  /** Id of the training program that was loaded last. */
  program: string;
}

export interface Skill extends Base {
  name: string;
  /** 1 = quick wins, 2 = main focus, 3 = long term, 4 = later */
  tier: number;
  position: number;
  /** Exercise whose best set measures this skill ('' = check off by hand). */
  exercise: string;
  /** Goal for a single set, in that exercise's measure. */
  goal: number;
  /** epoch ms, 0 = not achieved */
  achieved_at: number;
  note: string;
}

export interface Dismissal extends Base {
  key: string;
}

export interface Collections {
  exercises: Exercise;
  days: Day;
  plan_items: PlanItem;
  sessions: Session;
  sets: WorkSet;
  settings: Settings;
  skills: Skill;
  dismissals: Dismissal;
}

export type CollectionName = keyof Collections;

export const COLLECTIONS: CollectionName[] = [
  'exercises',
  'days',
  'plan_items',
  'sessions',
  'sets',
  'settings',
  'skills',
  'dismissals',
];

export interface OutboxOp {
  seq?: number;
  collection: CollectionName;
  id: string;
  op: 'upsert' | 'delete';
  data?: Record<string, unknown>;
}
