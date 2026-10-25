import type { DayKind, Measure } from './types';

// The calisthenics program. Loaded once per PROGRAM_ID by applyProgram();
// afterwards everything stays editable in the app. Exercises are matched by
// name, so history is kept, and progress already made in the old plan (a
// raised target or a later ladder step) is carried over.
//
// v2 (25 okt 2026): upper/lower — ma Upper A · di Lower A · wo Mobility ·
// do Upper B · vr Lower B · za/zo rust. Sessies ± 60–75 min.

export const PROGRAM_ID = 'calisthenics-2026-10-ul';

export interface ExerciseDef {
  name: string;
  measure: Measure;
  /** Suggest a higher target once reached twice in a row. */
  progress?: boolean;
  /** Next step in the ladder (name of another def). */
  next?: string;
  /** Target the exercise starts at when it replaces its predecessor. */
  sets?: number;
  target?: number;
  cue?: string;
}

const s = (name: string, extra: Omit<ExerciseDef, 'name' | 'measure'> = {}): ExerciseDef => ({ name, measure: 'seconds', ...extra });
const r = (name: string, extra: Omit<ExerciseDef, 'name' | 'measure'> = {}): ExerciseDef => ({ name, measure: 'reps', ...extra });

export const EXERCISES: ExerciseDef[] = [
  // handstand
  s('Chest-to-wall handstand', { cue: 'Borst naar de muur, lichaam recht' }),
  s('Vrije handstand', { cue: 'Kick-up pogingen, log per poging hoe lang je stond' }),
  r('Wall HSPU (deel-ROM)', { progress: true, next: 'Wall HSPU', sets: 3, target: 3 }),
  r('Wall HSPU', { progress: true }),
  // push / planche
  s('Elbow lever', { next: 'Crow pose', sets: 4, target: 10 }),
  s('Crow pose', { progress: true }),
  s('Planche lean', { progress: true, cue: 'Dieper leunen dan je gewend bent' }),
  s('Tuck planche', { next: 'Advanced tuck planche', sets: 6, target: 5, cue: 'Op parallettes' }),
  s('Advanced tuck planche', { progress: true, cue: 'Op parallettes' }),
  r('Weighted dips', { cue: 'Eerst 4×7, dan gewicht omhoog' }),
  r('Archer push-ups', { next: 'Pseudo planche push-ups', sets: 3, target: 8, cue: 'Reps per kant' }),
  r('Pseudo planche push-ups', { progress: true }),
  r('Pike push-ups voeten verhoogd', { next: 'Wall HSPU (deel-ROM)', sets: 3, target: 5 }),
  r('Bodyweight skull crusher', { progress: true, cue: 'Voeten verder naar achteren of bench lager = zwaarder' }),
  r('Pike to planche lean', { progress: true }),
  r('Incline bench press'),
  r('DB shoulder press'),
  r('Shoulder press'),
  // core / compression
  s('Tuck L-sit', { next: 'One-leg L-sit', sets: 4, target: 8, cue: 'Op parallettes' }),
  s('One-leg L-sit', { next: 'L-sit', sets: 3, target: 8 }),
  s('L-sit', { progress: true }),
  r('Compact leg lifts', { next: 'Dragon flag negatives', sets: 3, target: 5 }),
  r('Dragon flag negatives', { progress: true, cue: 'Zo langzaam mogelijk zakken' }),
  s('Hollow body hold', { progress: true }),
  s('Side plank', { progress: true, cue: 'Tijd per kant' }),
  // pull
  r('Scapular pull-ups'),
  r('Pull-ups', { progress: true, cue: '3 min rust · stop 1 rep voor failure' }),
  r('Pull-up negatives', { cue: '5 sec zakken' }),
  r('Explosive pull-ups', { cue: 'Borst richting de stang, alleen clean' }),
  r('Hammer grip pull-ups', { progress: true, cue: 'Niet tot failure' }),
  s('Advanced tuck front lever', { next: 'One-leg front lever', sets: 5, target: 6 }),
  s('One-leg front lever', { next: 'Straddle front lever', sets: 5, target: 5 }),
  s('Straddle front lever', { progress: true }),
  r('Bodyweight rows', { next: 'Bodyweight rows voeten verhoogd', sets: 4, target: 8 }),
  r('Bodyweight rows voeten verhoogd', { progress: true }),
  r('Bodyweight curls', { progress: true }),
  r('Pulldown', { cue: 'Of cable row' }),
  r('Rows'),
  r('Muscle-up step 1 (false grip)', { cue: 'Grip-werk: altijd aan het eind' }),
  r('Muscle-up'),
  s('Hollow body hang', { cue: 'Grip-werk: altijd aan het eind' }),
  // back lever / mobility skills
  s('German hang', { next: 'Skin the cat', sets: 3, target: 5, cue: 'Rustig opbouwen, schouders niet forceren' }),
  r('Skin the cat', { next: 'Tuck back lever', sets: 5, target: 6 }),
  s('Tuck back lever', { progress: true }),
  s('Shoulder stand', { progress: true }),
  s('Straddle sit', { progress: true }),
  // legs
  r('Pistol links negatives', { next: 'Pistol links', sets: 3, target: 3, cue: '5 sec zakken, steun als het moet' }),
  r('Pistol links', { progress: true }),
  r('Pistol rechts', { progress: true, cue: '1 sec pauze onderin' }),
  r('Bulgarian split squat', { cue: 'Reps per been · elke 2 weken +2 kg' }),
  r('Squats tempo', { cue: '3 sec zakken, 1 sec pauze' }),
  r('Reverse lunges', { cue: 'Reps per been' }),
  r('Single leg calf raises', { cue: 'Reps per been' }),
  r('Reverse nordic partials', { next: 'Reverse nordic', sets: 3, target: 5 }),
  r('Reverse nordic', { progress: true }),
  r('Archer squats', { progress: true, cue: 'Reps per kant' }),
  r('Sissy squats', { progress: true }),
  r('Single-leg glute bridges', { cue: 'Reps per been' }),
  r('Step-ups', { cue: 'Reps per been' }),
  // mobility
  s('Cat cow'),
  s('Cobra pose'),
  s("Child's pose"),
  s('Superman'),
  r('Reverse snow angel'),
  s('Squat to pike'),
  s('Prayer squat'),
  s('Pike stretch'),
  s('Pancake stretch'),
  s('Pols- en onderarmstretch'),
  { name: 'Zone 2', measure: 'minutes', cue: 'Of hiking op de loopband · praattempo' },
];

/** [exercise name, sets, target, note?, rest seconds?] — target 0 = no target (attempts). */
type Item = [string, number, number, string?, number?];

export interface DayDef {
  name: string;
  kind: DayKind;
  items: Item[];
}

const handstand: Item[] = [
  ['Chest-to-wall handstand', 3, 30, '± 8 min handstand, inclusief vrije pogingen'],
  ['Vrije handstand', 6, 0, 'Beste poging telt · Handsfree-timer'],
];
const handstandShort: Item[] = [['Vrije handstand', 6, 0, '5 min, polsen nog fris']];

/** Monday … Sunday */
export const DAYS: DayDef[] = [
  {
    name: 'Upper A · planche',
    kind: 'strength',
    items: [
      ...handstand,
      ['Planche lean', 3, 20],
      ['Tuck planche', 4, 5],
      ['Pull-ups', 5, 6, '3 min rust · stop 1 rep voor failure', 180],
      ['Pull-up negatives', 3, 1],
      ['Weighted dips', 4, 7],
      ['Advanced tuck front lever', 5, 8],
      ['Archer push-ups', 3, 6],
      ['Bodyweight rows', 3, 10],
      ['Muscle-up step 1 (false grip)', 3, 3],
    ],
  },
  {
    name: 'Lower A · pistol',
    kind: 'strength',
    items: [
      ...handstandShort,
      ['Elbow lever', 4, 10, 'Ellebogen tegen je heupen, langzaam naar voren leunen'],
      ['Pistol links negatives', 4, 4],
      ['Pistol rechts', 3, 5],
      ['Bulgarian split squat', 3, 8],
      ['Squats tempo', 3, 12],
      ['Reverse lunges', 3, 10],
      ['Single leg calf raises', 3, 15],
      ['Compact leg lifts', 3, 15],
    ],
  },
  {
    name: 'Mobility + zone 2',
    kind: 'strength',
    items: [
      ['German hang', 3, 30],
      ['Shoulder stand', 3, 20],
      ['Straddle sit', 3, 12],
      ['Tuck L-sit', 4, 12],
      ['Cat cow', 1, 60],
      ['Cobra pose', 1, 60],
      ["Child's pose", 1, 60],
      ['Superman', 2, 45],
      ['Reverse snow angel', 2, 15],
      ['Squat to pike', 1, 60],
      ['Prayer squat', 1, 60],
      ['Pike stretch', 2, 45],
      ['Pancake stretch', 2, 45],
      ['Pols- en onderarmstretch', 2, 30],
      ['Zone 2', 1, 30, 'Of hiking · niet allebei zwaar'],
    ],
  },
  {
    name: 'Upper B · handstand',
    kind: 'strength',
    items: [
      ...handstand,
      ['Pike to planche lean', 3, 5],
      ['Explosive pull-ups', 4, 3],
      ['Hammer grip pull-ups', 4, 6, 'Niet tot failure'],
      ['Pike push-ups voeten verhoogd', 3, 8],
      ['Archer push-ups', 3, 6],
      ['Bodyweight curls', 3, 8],
      ['Bodyweight skull crusher', 3, 10, '1–2 reps in de tank'],
      ['Rows', 3, 8],
      ['Tuck L-sit', 3, 10],
    ],
  },
  {
    name: 'Lower B · nordic',
    kind: 'strength',
    items: [
      ...handstandShort,
      ['Elbow lever', 3, 10],
      ['Reverse nordic partials', 3, 8],
      ['Archer squats', 4, 6],
      ['Sissy squats', 3, 8],
      ['Single-leg glute bridges', 3, 12],
      ['Step-ups', 3, 10],
      ['Hollow body hold', 3, 45],
      ['Side plank', 2, 45],
    ],
  },
  { name: 'Rust', kind: 'rest', items: [] },
  { name: 'Rust', kind: 'rest', items: [] },
];

export interface SkillDef {
  name: string;
  /** 0 = already achieved, 1 = quick wins, 2 = main focus, 3 = long term, 4 = later */
  tier: number;
  exercise?: string;
  goal?: number;
  note?: string;
}

export const SKILLS: SkillDef[] = [
  { name: 'Hollow body hang (30 s)', tier: 0, exercise: 'Hollow body hang', goal: 30 },
  { name: 'Hollow body hold (45 s)', tier: 0, exercise: 'Hollow body hold', goal: 45 },
  { name: 'Frog stand (12 s)', tier: 0 },
  { name: 'Planche lean (30 s)', tier: 0, exercise: 'Planche lean', goal: 30 },
  { name: 'Planche lean push-ups (8)', tier: 0 },
  { name: 'Tuck front lever (12 s)', tier: 0 },
  { name: "Butcher's block (30 s)", tier: 0 },
  { name: 'Pike push-ups (10)', tier: 0 },
  { name: 'Pistol rechts', tier: 0, exercise: 'Pistol rechts', goal: 1 },

  { name: 'Elbow lever (12 s)', tier: 1, exercise: 'Elbow lever', goal: 12 },
  { name: 'Shoulder stand (12 s)', tier: 1, exercise: 'Shoulder stand', goal: 12 },
  { name: 'Straddle sit (12 s)', tier: 1, exercise: 'Straddle sit', goal: 12 },
  { name: 'German hang (30 s)', tier: 1, exercise: 'German hang', goal: 30 },

  { name: 'Vrije handstand (10 s)', tier: 2, exercise: 'Vrije handstand', goal: 10 },
  { name: 'Vrije handstand (20 s)', tier: 2, exercise: 'Vrije handstand', goal: 20 },
  { name: 'L-sit (12 s)', tier: 2, exercise: 'L-sit', goal: 12, note: 'Via tuck L-sit en one-leg L-sit' },
  { name: 'Compact leg lifts (15)', tier: 2, exercise: 'Compact leg lifts', goal: 15 },
  { name: 'Archer push-ups (6 per kant)', tier: 2, exercise: 'Archer push-ups', goal: 6 },
  { name: 'Pistol links', tier: 2, exercise: 'Pistol links', goal: 1 },
  { name: '10 nette pull-ups', tier: 2, exercise: 'Pull-ups', goal: 10 },
  { name: 'Advanced tuck front lever (10 s)', tier: 2, exercise: 'Advanced tuck front lever', goal: 10 },

  { name: 'Tuck planche (12 s)', tier: 3, exercise: 'Tuck planche', goal: 12 },
  { name: 'Tuck back lever (12 s)', tier: 3, exercise: 'Tuck back lever', goal: 12, note: 'Na German hang en skin the cat' },
  { name: 'Reverse nordic (12)', tier: 3, exercise: 'Reverse nordic', goal: 12 },
  { name: 'Muscle-up (5)', tier: 3, exercise: 'Muscle-up', goal: 5, note: 'Eerst 10 nette pull-ups' },
  { name: 'Pistol squat (12)', tier: 3, exercise: 'Pistol links', goal: 12, note: 'Links is je beperkende kant' },

  { name: 'Vertical flag', tier: 4, note: 'Paal of wandrek nodig' },
  { name: 'Human flag', tier: 4, note: 'Na L-sit en advanced tuck front lever' },
  { name: 'Dragon flag', tier: 4, exercise: 'Dragon flag negatives', goal: 0, note: 'Afvinken als de volledige versie lukt' },
  { name: 'Wall HSPU', tier: 4, exercise: 'Wall HSPU', goal: 1 },
  { name: 'Straddle front lever (5 s)', tier: 4, exercise: 'Straddle front lever', goal: 5 },
  { name: 'Advanced tuck planche (10 s)', tier: 4, exercise: 'Advanced tuck planche', goal: 10 },
];

export const TIERS: { tier: number; label: string; hint: string }[] = [
  { tier: 1, label: 'Snel af te vinken', hint: '± 4–8 weken' },
  { tier: 2, label: 'Hoofdfocus', hint: '± 2–3 maanden' },
  { tier: 3, label: 'Lange termijn', hint: 'geen deadline' },
  { tier: 4, label: 'Later', hint: 'na de lagen hierboven' },
];
