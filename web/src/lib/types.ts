export type DayKind = 'strength' | 'cardio' | 'rest';

export interface Base {
  id: string;
  user: string;
}

export interface Exercise extends Base {
  name: string;
  /** Weight step in kg for steppers and overload hints (0 = use default). */
  increment: number;
  archived: boolean;
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
  target_reps: number;
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
  reps: number;
  at: number;
}

export interface Settings extends Base {
  rest_seconds: number;
  increment: number;
}

export interface Collections {
  exercises: Exercise;
  days: Day;
  plan_items: PlanItem;
  sessions: Session;
  sets: WorkSet;
  settings: Settings;
}

export type CollectionName = keyof Collections;

export const COLLECTIONS: CollectionName[] = [
  'exercises',
  'days',
  'plan_items',
  'sessions',
  'sets',
  'settings',
];

export interface OutboxOp {
  seq?: number;
  collection: CollectionName;
  id: string;
  op: 'upsert' | 'delete';
  data?: Record<string, unknown>;
}
