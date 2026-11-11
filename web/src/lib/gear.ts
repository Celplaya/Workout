import { hitTarget, performances } from './progress';
import { bestValue } from './stats';
import type { Exercise, Session, WorkSet } from './types';

// Equipment advice: what is worth buying now, what can wait and what is not
// needed, based on what is in the plan and on the logged sets. "Heb ik" is
// stored as a dismissal key, so it syncs like the rest.

export interface GearCheck {
  label: string;
  done: boolean;
  detail: string;
}

export interface GearAdvice {
  id: 'parallettes' | 'vest' | 'box';
  name: string;
  /** now = worth getting, later = not yet, no = not needed. */
  status: 'now' | 'later' | 'no';
  have: boolean;
  summary: string;
  points: string[];
  /** When this advice flips to "now". */
  checks: GearCheck[];
  buy?: string;
}

export interface GearInput {
  exercises: Exercise[];
  setsByExercise: Map<string, WorkSet[]>;
  sessionsById: Map<string, Session>;
  dismissed: Set<string>;
}

export const haveKey = (id: string) => `gear:${id}:have`;
export const skipKey = (id: string) => `gear:${id}:skip`;

const slug = (s: string) => s.trim().toLowerCase();

export function gearAdvice(input: GearInput): GearAdvice[] {
  const byName = new Map(input.exercises.map((e) => [slug(e.name), e]));
  const latest = (name: string): WorkSet[] => {
    const ex = byName.get(slug(name));
    if (!ex) return [];
    return performances(input.setsByExercise.get(ex.id) ?? [], input.sessionsById)[0]?.sets ?? [];
  };
  const reps = (sets: WorkSet[]) => (sets.length ? 'laatste keer ' + sets.map((s) => s.reps).join(', ') : 'nog niet gelogd');

  const rows = latest('Bodyweight rows voeten verhoogd');
  const pulls = latest('Pull-ups');
  const rowsDone = hitTarget(rows, 3, 12);
  const pullsDone = bestValue(pulls) >= 10;
  const vestNow = rowsDone || pullsDone;

  const out: GearAdvice[] = [
    {
      id: 'parallettes',
      name: 'Parallettes (de balkjes)',
      status: 'now',
      have: false,
      summary: 'Ja, halen. Je gebruikt ze nu al in drie oefeningen en ze sparen je polsen en onderarmen.',
      points: [
        'Tuck planche, tuck L-sit en planche lean staan in je schema; L-sit en advanced tuck planche komen daarna.',
        'Je polsen blijven recht in plaats van 90° geknikt. Dat scheelt precies de onderarmbelasting waar je last van had.',
        'Voor de L-sit heb je de hoogte nodig om je benen vrij van de grond te houden.',
      ],
      checks: [],
      buy: 'Lage houten parallettes, ± 10–15 cm hoog en minstens 30 cm lang. Hout geeft meer grip dan gladde metalen buis.',
    },
    {
      id: 'vest',
      name: 'Gewichtvest',
      status: vestNow ? 'now' : 'later',
      have: false,
      summary: vestNow
        ? 'Nu zinvol: je bent toe aan extra gewicht. 5–10 kg is ruim genoeg om mee te beginnen.'
        : 'Nog niet nodig. Je kunt alles in je schema eerst zwaarder maken zonder vest.',
      points: vestNow
        ? [
            'Neem een verstelbaar vest (tot ± 10–20 kg) dat strak zit, zodat het niet schuift bij rows en pull-ups.',
            'Begin met 2,5–5 kg en log het gewicht bij de set: de app stelt dan vanzelf de volgende stap voor.',
            'Dips blijf je doen met riem of dumbbell; dat laadt makkelijker zwaar.',
          ]
        : [
            'Rows: eerst de stang lager, dan 3 sec zakken en 2 sec vasthouden, dan archer rows.',
            'Pull-ups: eerst naar 10 nette reps. Tot die tijd levert meer reps meer op dan meer gewicht.',
            'Dips doe je al met gewicht aan een riem of dumbbell: daar voegt een vest niets toe.',
            'Wil je toch eerder laden? Een rugzak met een schijf erin, of een schijf op je heupen bij rows, doet hetzelfde.',
          ],
      checks: [
        { label: 'Rows voeten verhoogd 3×12', done: rowsDone, detail: reps(rows) },
        { label: 'Pull-ups: 10 reps in één set', done: pullsDone, detail: reps(pulls) },
      ],
      buy: vestNow ? undefined : 'Verschijnt als voorstel op Vandaag zodra één van de twee punten hierboven gehaald is.',
    },
    {
      id: 'box',
      name: 'Box hoger maken voor rows',
      status: 'no',
      have: false,
      summary: 'Niet nodig. 30 cm is genoeg; er hoeft niets extra op je box.',
      points: [
        'Het zwaarst is een row als je lichaam horizontaal hangt. Dat regel je met de hoogte van de stang, niet met een hogere box.',
        'Zet de stang zo laag dat je onderin net vrij van de grond hangt met je hielen op de box.',
        'Liggen je voeten hoger dan de stang, dan wordt het vooral wiebelig en krijg je er weinig voor terug.',
        'Daarna: 3 sec zakken, 2 sec vasthouden, 3×12, en dan archer rows.',
      ],
      checks: [],
    },
  ];
  for (const g of out) g.have = input.dismissed.has(haveKey(g.id));
  return out;
}

/** Advice worth a card on Vandaag: buy-now items that are not owned or waved away. */
export function gearProposals(list: GearAdvice[], dismissed: Set<string>): GearAdvice[] {
  return list.filter((g) => g.status === 'now' && !g.have && !dismissed.has(skipKey(g.id)));
}
