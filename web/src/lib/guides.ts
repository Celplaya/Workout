import type { Frame, Joint, Pose } from './figure';

// Exercise guides: an animated stick figure plus short form cues, matched to
// exercises by name. Coordinates: viewBox 0 0 120 105, floor at y = 100,
// the figure faces right. Angles: 0 = right, 90 = down, -90 = up.

export type Prop =
  | { t: 'bar'; x: number; y: number; post?: boolean }
  | { t: 'wall'; x: number; from?: number; to?: number; side?: 1 | -1 }
  | { t: 'box'; x: number; y: number; w: number; h: number; label?: string }
  | { t: 'stepper'; x: number; y: number; w: number; label?: string }
  | { t: 'bench'; x: number; y: number; w: number }
  | { t: 'pbar'; x: number; y: number; w: number }
  | { t: 'vest' }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; w?: number }
  | { t: 'cable'; x: number; y: number }
  | { t: 'dumbbells' }
  | { t: 'barbell' }
  | { t: 'plate' }
  | { t: 'weight' }
  | { t: 'mat'; x: number; y: number; w: number; h: number };

export interface Guide {
  name: string;
  view?: 'side' | 'front' | 'top';
  vb?: [number, number, number, number];
  floor?: number | false;
  props?: Prop[];
  frames: Frame[];
  /** Frame shown when animation is off. */
  key?: number;
  cues: string[];
  tip?: string;
  /** Highlighted body part with a short label (offset in viewBox units). */
  mark?: { joint: Joint; label: string; dx: number; dy: number };
  /** Arrow showing how a joint travels from frame `from` to frame `to`. */
  arrow?: { joint: Joint; from: number; to: number; bend?: number };
  /** Face direction flip for poses where the default guess is wrong. */
  face?: 1 | -1;
  /** Hands are closed around something even though no pose pins them. */
  grip?: boolean;
  /** Direction flat hands point to (default: toward the head/chest side). */
  fingers?: 1 | -1;
}

const f = (p: Pose, hold?: number, tween?: number): Frame => ({ p, hold, tween });

// ---------- measurements ----------
// Standing figure: ankle 97.9, hip 61.9, shoulder 35.9, top of the head ± 23.
const FOOT = 97.9; // ankle height with the foot flat on the floor
const TOE = 93.2; // ankle height on the ball of the foot (foot angle 85)
const hand = (x: number, y = 98.3, b = 1): [number, number, number] => [x, y, b];
const hands = (x: number, y = 98.3, b = 1): Pose['ik'] => ({ an: [x, y, b], af: [x + 1.5, y, b] });

// ---------- shared poses ----------

const BAR = { t: 'bar', x: 60, y: 10 } as const;
const onBar = hands(60, 10);
const HANG_VB: [number, number, number, number] = [0, -10, 120, 115];

/** Side view, hanging from the bar (arm roots 27 below it). */
const hang = (o: Partial<Pose> = {}): Pose => ({
  spine: [-90, -90], ln: [90, 90, 60], lf: [92, 92, 62], at: ['sh', 60, 37.1], ik: onBar, ...o,
});

// Front lever family: everything hangs from the near hand.
const leverHang: Pose = { spine: [-90, -90], an: [-90, -90], af: [-88, -88], ln: [90, 90, 60], lf: [92, 92, 62], at: ['hN', 60, 10] };
const lever = (arms: number, ln: number[], lf: number[]): Pose => ({
  spine: [-180, -180], an: [arms, arms], af: [arms + 2, arms + 2], ln, lf, at: ['hN', 60, 10],
});

// Push-up line: ankles on the balls of the feet, body straight.
const plank = (ax: number, a: number, o: Partial<Pose> = {}): Pose => ({
  spine: [a, a], ln: [a + 180, a + 180, 85], lf: [a + 181, a + 181, 87], at: ['aN', ax, TOE], ik: hands(66), ...o,
});
const pushTop = plank(8, -20.6);
const lean = plank(17.4, -18.7, { spine: [-20.5, -16.5] });

// Handstand, chest facing left (as after a kick-up from standing facing right).
const hs = (x: number, o: Partial<Pose> = {}): Pose => ({
  spine: [90, 90], head: 66, shrug: 1.5, ln: [-90, -90, -90], lf: [-91.5, -91.5, -91.5], at: ['sh', x, 69.9],
  ik: hands(x - 0.7, 98.3, 1), ...o,
});
/** Wall handstand push-up: shoulder position + lean of the body (feet slide on the wall). */
const hspu = (sx: number, sy: number, tilt: number, head: number): Pose => ({
  spine: [90 + tilt, 90 + tilt], head, ln: [-90 + tilt, -90 + tilt, -90 + tilt], lf: [-91 + tilt, -91 + tilt, -91 + tilt],
  at: ['sh', sx, sy], ik: hands(62.2, 98.3, -1),
});

// Low parallettes (rail at y = 90) and the tuck on them.
const PAR = { t: 'pbar', x: 57, y: 90, w: 20 } as const;
const onPar = hands(66, 90);
const tuckPlanche: Pose = {
  spine: [-32, 20], head: 8, ln: [0, 0, 165], lf: [0, 0, 167], at: ['sh', 75.2, 64.6],
  ik: { ...onPar, ln: [51.4, 80.8, -1], lf: [50.4, 79.6, -1] },
};

// L-sit family on parallettes (rail at y = 88).
const PAR_L = { t: 'pbar', x: 50, y: 88, w: 20 } as const;
const lsit = (ln: number[], lf: number[], o: Partial<Pose> = {}): Pose => ({
  spine: [-92, -90], ln, lf, at: ['sh', 58.5, 61.3], ik: hands(59.3, 88), ...o,
});
const tuckLegs: [number[], number[]] = [[-50, 100, 40], [-47, 103, 43]];

// Hands and knees.
const quad = (spine: [number, number], head: number, hx = 59.5, thigh = 90): Pose => ({
  spine, head, ln: [thigh, 180, 180], lf: [thigh + 1.5, 181, 181], at: ['kN', 36, 96.8], ik: hands(hx),
});

// Pistol squat: the near leg is the standing leg.
const pistolTop: Pose = { spine: [-88, -88], an: [0, 0], af: [3, 3], ln: [90, 90, 0], lf: [35, 35, -20], at: ['aN', 56, FOOT] };
const pistolBottom: Pose = { spine: [-50, -58], an: [0, 0], af: [3, 3], ln: [-17, 125, 0], lf: [-4, -4, -55], at: ['aN', 56, FOOT] };

// Inverted rows: heels down, face up. Body angle a (negative = head higher).
const row = (ax: number, ay: number, a: number, bar: [number, number], foot: number, bend = -1): Pose => ({
  spine: [a, a], ln: [a + 180, a + 180, foot], lf: [a + 181, a + 181, foot], at: ['aN', ax, ay],
  ik: { an: [bar[0], bar[1], bend], af: [bar[0] + 1.5, bar[1], bend] },
});

// Front views.
const FBAR = { t: 'line', x1: 26, y1: 10, x2: 94, y2: 10, w: 3 } as const;
const PULL_VB: [number, number, number, number] = [0, -12, 120, 117];
const fGrip = (hx: number): Pose['ik'] => ({ an: [60 + hx, 10, 1], af: [60 - hx, 10, -1] });
const fLegs = { ln: [89, 89, 55], lf: [91, 91, 125] };
/** Dead hang seen from the front: shoulders shrugged up to the ears. */
const fHang = (hx = 13): Pose => ({
  spine: [-90, -90], w: 7, hw: 4, shrug: 2.5, ...fLegs,
  at: ['sh', 60, 12.2 + Math.sqrt(27 * 27 - (hx - 7) * (hx - 7))], ik: fGrip(hx),
});
const fTop = (hx = 13, y = 11.7): Pose => ({ spine: [-90, -90], w: 7, hw: 4, ...fLegs, at: ['sh', 60, y], ik: fGrip(hx) });
const fStand = (o: Partial<Pose>): Pose => ({ spine: [-90, -90], w: 7, hw: 4.5, ln: [88, 88, 40], lf: [92, 92, 140], at: ['hip', 60, 61.9], ...o });
const topView = (x: number, y = 41): Pose => ({
  spine: [-90, -90], w: 7, hw: 4, ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', x, y], ik: { an: [91, 40, 1], af: [29, 40, -1] },
});

// ---------- guides ----------

export const GUIDES: Guide[] = [
  // ----- handstand -----
  {
    name: 'Chest-to-wall handstand',
    mark: { joint: 'mid', label: 'buik in, billen aan', dx: 14, dy: 0 },
    props: [{ t: 'wall', x: 54.5, side: -1 }],
    frames: [f(hs(60, { spine: [88.5, 88.5], ln: [-91.5, -91.5, -91.5], lf: [-93, -93, -93] }))],
    cues: [
      'Handen schouderbreed, 10–15 cm van de muur, en loop met je voeten de muur op.',
      'Duw de vloer actief weg: schouders richting je oren, armen gestrekt.',
      'Buik in, billen aan, tenen gestrekt: één rechte lijn van handen tot tenen.',
      'Kijk naar de vloer tussen je handen.',
    ],
    tip: 'Zakt je rug hol? Zet je handen iets dichter bij de muur en span je billen harder aan.',
  },
  {
    name: 'Vrije handstand',
    mark: { joint: 'hN', label: 'vingers sturen de balans', dx: -6, dy: -12 },
    arrow: { joint: 'aF', from: 1, to: 2, bend: -12 },
    frames: [
      f({ spine: [-84, -84], an: [-86, -86], af: [-84, -84], at: ['hip', 44, 64], ik: { ln: [56, FOOT, -1], lf: [27, 95.5, -1] } }, 700, 0),
      f({ spine: [27.4, 27.4], head: 20, ln: [0, 0, 60], lf: [205, 205, 205], at: ['hip', 55, 59.5], ik: { ...hands(77.3), ln: [56, 95, -1] } }, 0, 850),
      f(hs(78), 1900, 750),
    ],
    key: 2,
    cues: [
      'Stap in een lunge met je armen gestrekt boven je hoofd.',
      'Plaats je handen schouderbreed en zwaai je achterste been gestrekt omhoog; het andere been volgt.',
      'Bovenin: armen naast je oren, buik in, billen aan, tenen wijzen.',
      'Balans houd je met je vingers: druk ze in de grond als je naar voren valt.',
    ],
    tip: 'Oefen eerst uitkomen: stap terug of draai weg (pirouette). Gebruik de handsfree-timer om je tijd te loggen.',
  },
  {
    name: 'Wall HSPU (deel-ROM)',
    mark: { joint: 'eN', label: 'ellebogen schuin naar achteren', dx: -4, dy: -34 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -5 },
    props: [{ t: 'wall', x: 73 }],
    frames: [f(hspu(63.2, 71.4, 7.5, 76), 400, 1000), f(hspu(58.5, 79, 11.6, 112), 300, 1400)],
    cues: [
      'Handstand met je rug naar de muur, handen ± een handlengte van de muur.',
      'Zak gecontroleerd tot halverwege: je hoofd gaat iets vóór je handen (driehoek).',
      'Ellebogen schuin naar achteren, niet wijd uit.',
      'Druk jezelf terug tot gestrekte armen.',
    ],
    tip: 'Leg een opgevouwen handdoek of kussen onder je hoofd als stopmoment; maak hem dunner als je sterker wordt.',
  },
  {
    name: 'Wall HSPU',
    mark: { joint: 'head', label: 'hoofd vóór je handen', dx: -6, dy: -22 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -6 },
    props: [{ t: 'wall', x: 73 }],
    frames: [f(hspu(63.2, 71.4, 7.5, 76), 400, 1000), f(hspu(53, 87, 16.5, 130), 250, 1700)],
    cues: [
      'Handstand met je rug naar de muur, handen ± een handlengte van de muur.',
      'Zak tot je hoofd licht de grond raakt, een stuk vóór je handen (driehoek).',
      'Ellebogen schuin naar achteren, lichaam blijft strak.',
      'Druk door tot gestrekte armen, schouders naar je oren.',
    ],
    tip: 'Niet met je hoofd op de grond leunen: alleen even aantikken.',
  },

  // ----- balance / planche -----
  {
    name: 'Elbow lever',
    mark: { joint: 'eN', label: 'ellebogen in je buik', dx: 2, dy: -30 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    fingers: -1,
    frames: [
      f({ spine: [-3, -6], head: -14, ln: [162, 162, 95], lf: [163.5, 163.5, 97], at: ['hip', 46.5, 82], ik: hands(56, 98.3, 1) }, 700, 1000),
      f({ spine: [-2, -4], head: -12, ln: [182, 182, 182], lf: [183.5, 183.5, 183.5], at: ['hip', 48, 82], ik: hands(56, 98.3, 1) }, 2200, 1300),
    ],
    key: 1,
    cues: [
      'Handen schouderbreed, vingers naar opzij of iets naar achteren.',
      'Ellebogen tegen je heupbotten of navel: daar steunt je lichaam op.',
      'Leun heel langzaam naar voren tot je voeten vanzelf loskomen.',
      'Lichaam strak als een plank, kijk vooruit.',
    ],
    tip: 'Lukt het niet? Begin met je knieën gebogen of één voet op de grond, en train hem fris.',
  },
  {
    name: 'Crow pose',
    mark: { joint: 'kN', label: 'knieën op je bovenarmen', dx: -8, dy: -30 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -6 },
    frames: [
      f({ spine: [-57, -1], head: -10, ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 44, 84], ik: { ...hands(68), ln: [50, FOOT, -1], lf: [51.5, FOOT, -1] } }, 600, 1000),
      f({ spine: [-8, 31], head: 4, ln: [0, 0, 172], lf: [0, 0, 174], at: ['hip', 50, 72], ik: { ...hands(68), ln: [47, 87, -1], lf: [46, 85.6, -1] } }, 2000, 1100),
    ],
    key: 1,
    cues: [
      'Hurk, handen schouderbreed op de grond, vingers gespreid.',
      'Zet je knieën hoog tegen de achterkant van je bovenarmen.',
      'Leun naar voren tot je voeten loskomen; kijk iets voor je handen.',
      'Ellebogen licht gebogen, buik in.',
    ],
    tip: 'Leg een kussen voor je hoofd voor als je doorkantelt.',
  },
  {
    name: 'Planche lean',
    mark: { joint: 'sh', label: 'schouders vóór je handen', dx: -4, dy: -24 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -9 },
    frames: [f(pushTop, 500, 1000), f(lean, 2000, 1200)],
    key: 1,
    cues: [
      'Start in push-up positie, armen gestrekt en ellebogen op slot.',
      'Leun naar voren tot je schouders vóór je handen zijn (op je tenen).',
      'Duw de grond weg: schouders naar voren en omlaag, bovenrug licht rond.',
      'Billen en buik aan, lichaam recht.',
    ],
    tip: 'Op parallettes blijven je polsen recht: prettiger als je onderarmen snel vol lopen. Warm je polsen altijd eerst op.',
  },
  {
    name: 'Tuck planche',
    mark: { joint: 'eN', label: 'armen op slot', dx: 16, dy: 8 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 6 },
    props: [PAR],
    frames: [
      f({ spine: [-43, 0], head: 8, ln: [0, 0, 0], lf: [0, 0, 0], at: ['sh', 68.5, 63.1], ik: { ...onPar, ln: [54, FOOT, -1], lf: [55.5, FOOT, -1] } }, 500, 1000),
      f(tuckPlanche, 1800, 1000),
    ],
    key: 1,
    cues: [
      'Handen op de parallettes, armen gestrekt, ellebogen op slot.',
      'Leun naar voren tot je schouders ver voor je handen zijn.',
      'Rug rond (duw de grond weg), knieën strak tegen je borst.',
      'Til je voeten op; heupen op schouderhoogte.',
    ],
    tip: 'Gebogen armen maken er een frog stand van: houd ze echt recht, ook al is de hold dan korter.',
  },
  {
    name: 'Advanced tuck planche',
    mark: { joint: 'mid', label: 'rug plat', dx: -4, dy: -18 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 8 },
    props: [PAR],
    frames: [
      f(tuckPlanche, 900, 1000),
      f({ spine: [-1.5, -1.5], head: 8, ln: [0, 0, 178], lf: [0, 0, 180], at: ['sh', 76.5, 65], ik: { ...onPar, ln: [35.8, 85.4, -1], lf: [34.8, 84, -1] } }, 1800, 1200),
    ],
    key: 1,
    cues: [
      'Vanuit tuck planche: duw je heupen naar achteren tot je rug plat is.',
      'Knieën onder je heupen, schenen wijzen naar achteren.',
      'Armen gestrekt, schouders ver voor je handen.',
      'Kijk iets voor je handen, buik aan.',
    ],
    tip: 'Platte rug is het verschil met de tuck planche. Wordt je rug rond, dan ben je terug bij de tuck.',
  },
  {
    name: 'Pike to planche lean',
    mark: { joint: 'sh', label: 'schouders naar voren', dx: 4, dy: -22 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 8 },
    frames: [
      f({ spine: [22, 22], ln: [121, 121, 85], lf: [122, 122, 87], at: ['aN', 17.4, TOE], ik: hands(66) }, 500, 1100),
      f(lean, 900, 1200),
    ],
    cues: [
      'Start in een pike: heupen hoog, armen en benen gestrekt.',
      'Schuif je schouders naar voren terwijl je heupen zakken.',
      'Eindig in een planche lean: schouders vóór je handen, lichaam recht.',
      'Armen blijven de hele tijd gestrekt.',
    ],
    tip: 'Rustig bewegen; het gaat om de schouderpositie, niet om snelheid.',
  },

  // ----- push -----
  {
    name: 'Weighted dips',
    mark: { joint: 'eN', label: 'ellebogen naar achteren', dx: -12, dy: -22 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -8 },
    props: [{ t: 'pbar', x: 40, y: 56, w: 44 }, { t: 'weight' }],
    frames: [
      f({ spine: [-84, -84], ln: [100, 165, 150], lf: [103, 168, 153], at: ['sh', 60.5, 29.2], ik: hands(60, 56) }, 400, 1000),
      f({ spine: [-68, -68], ln: [108, 172, 157], lf: [111, 175, 160], at: ['sh', 69.9, 45.5], ik: hands(60, 56) }, 300, 1400),
    ],
    cues: [
      'Start bovenin met gestrekte armen, schouders laag (weg van je oren).',
      'Zak tot je bovenarm ongeveer horizontaal is.',
      'Leun iets voorover, ellebogen naar achteren.',
      'Druk jezelf terug omhoog tot gestrekte armen.',
    ],
    tip: 'Pijn voor in je schouder? Minder diep zakken en het gewicht omlaag.',
  },
  {
    name: 'Archer push-ups',
    mark: { joint: 'head', label: 'schuif naar één kant', dx: 0, dy: -14 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -6 },
    view: 'top',
    floor: false,
    props: [{ t: 'mat', x: 22, y: 26, w: 76, h: 80 }],
    frames: [f(topView(60, 40), 400, 900), f(topView(52), 600, 1100), f(topView(60, 40), 400, 1100), f(topView(68), 600, 1100)],
    key: 1,
    cues: [
      'Handen heel breed, vingers schuin naar buiten.',
      'Zak naar één kant: die arm buigt, de andere blijft gestrekt.',
      'Lichaam strak als bij een gewone push-up.',
      'Duw terug naar het midden en wissel van kant.',
    ],
    tip: 'Te zwaar? Leg de gestrekte hand op je stepper, of begin met minder diepte.',
  },
  {
    name: 'Pseudo planche push-ups',
    mark: { joint: 'eN', label: 'ellebogen langs je lichaam', dx: -6, dy: -26 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -6 },
    frames: [f(lean, 300, 1000), f(plank(17.4, -3.4, { spine: [-4.4, -2.4] }), 300, 1400)],
    cues: [
      'Handen bij je heupen, vingers naar opzij of achteren.',
      'Leun naar voren tot je schouders ver voor je handen zijn.',
      'Zak met je ellebogen langs je lichaam naar achteren.',
      'Houd de lean ook tijdens het omhoog duwen.',
    ],
    tip: 'Hoe verder je leunt, hoe zwaarder. Bouw het rustig op voor je polsen.',
  },
  {
    name: 'Pike push-ups voeten verhoogd',
    mark: { joint: 'head', label: 'hoofd vóór je handen', dx: 4, dy: -30 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -6 },
    props: [{ t: 'stepper', x: 8, y: 92, w: 34, label: 'stepper' }],
    frames: [
      f({ spine: [45.6, 45.6], head: 50, ln: [116.4, 116.4, 85], lf: [117.4, 117.4, 87], at: ['aN', 28, 85.2], ik: hands(66) }, 300, 1000),
      f({ spine: [51.4, 51.4], head: 45, ln: [147.2, 147.2, 85], lf: [148.2, 148.2, 87], at: ['aN', 28, 85.2], ik: hands(66) }, 300, 1400),
    ],
    cues: [
      'Tenen op je stepper, handen op de grond, heupen hoog boven je handen.',
      'Zak met je hoofd naar een punt vóór je handen (driehoek).',
      'Ellebogen schuin naar achteren, niet wijd uit.',
      'Duw terug tot gestrekte armen en duw je schouders naar je oren.',
    ],
    tip: 'Hoe hoger je voeten, hoe meer gewicht op je schouders. Na de stepper is je grote box de volgende stap.',
  },
  {
    name: 'Pike push-ups voeten op box',
    mark: { joint: 'hip', label: 'heupen boven je handen', dx: 10, dy: -14 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -6 },
    props: [{ t: 'box', x: 4, y: 78, w: 34, h: 22, label: 'box' }],
    frames: [
      f({ spine: [69, 69], head: 62, ln: [137.8, 137.8, 85], lf: [138.8, 138.8, 87], at: ['aN', 29.35, 71.2], ik: hands(66) }, 300, 1000),
      f({ spine: [66.7, 66.7], head: 45, ln: [165.4, 165.4, 85], lf: [166.4, 166.4, 87], at: ['aN', 29.35, 71.2], ik: hands(66) }, 300, 1500),
    ],
    cues: [
      'Tenen op de box (± heuphoogte), loop je handen terug tot je romp bijna verticaal is.',
      'Zak met je hoofd naar een punt vóór je handen (driehoek).',
      'Ellebogen schuin naar achteren, benen gestrekt.',
      'Duw terug tot gestrekte armen.',
    ],
    tip: 'Dit is de laatste stap vóór de wall HSPU: hoe verticaler je romp, hoe dichter je erbij zit.',
  },
  {
    name: 'Bodyweight skull crusher',
    mark: { joint: 'eN', label: 'ellebogen wijzen naar voren', dx: -2, dy: -22 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 6 },
    props: [{ t: 'bench', x: 81, y: 77, w: 34 }],
    frames: [
      f({ ...plank(12, -33.4), ik: hands(84, 76, -1) }, 300, 1000),
      f({ ...plank(12, -18, { head: -5 }), ik: hands(84, 76, -1) }, 300, 1400),
    ],
    cues: [
      'Handen op een bank of stang, lichaam strak in een schuine plank.',
      'Buig alleen je ellebogen: je voorhoofd gaat naar je handen.',
      'Ellebogen wijzen naar voren, niet naar buiten.',
      'Strek je armen weer volledig.',
    ],
    tip: 'Voeten verder naar achteren of de bank lager = zwaarder.',
  },

  // ----- gym -----
  {
    name: 'Incline bench press',
    mark: { joint: 'hN', label: 'naar je bovenborst', dx: 16, dy: 2 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 6 },
    props: [{ t: 'line', x1: 58, y1: 86, x2: 30, y2: 52.6, w: 4.5 }, { t: 'line', x1: 44, y1: 86, x2: 64, y2: 86, w: 4.5 }, { t: 'line', x1: 50, y1: 88, x2: 50, y2: 100, w: 2 }, { t: 'plate' }],
    frames: [
      f({ spine: [-130, -130], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 52, 80], ik: { an: [45, 59.5, 1], af: [46, 59.5, 1], ln: [71, FOOT, -1], lf: [72.5, FOOT, -1] } }, 300, 1400),
      f({ spine: [-130, -130], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 52, 80], ik: { an: [38.5, 33.3, 1], af: [39.5, 33.3, 1], ln: [71, FOOT, -1], lf: [72.5, FOOT, -1] } }, 400, 1000),
    ],
    cues: [
      'Bank op ± 30–45°, voeten stevig op de grond.',
      'Laat de stang gecontroleerd zakken naar je bovenborst.',
      'Ellebogen schuin onder de stang, niet helemaal wijd.',
      'Druk omhoog tot gestrekte armen.',
    ],
  },
  {
    name: 'DB shoulder press',
    mark: { joint: 'hN', label: 'recht omhoog', dx: 10, dy: 12 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 8 },
    view: 'front',
    props: [{ t: 'dumbbells' }],
    frames: [
      f(fStand({ ik: { an: [75, 33, 1], af: [45, 33, -1] } }), 300, 1300),
      f(fStand({ ik: { an: [68.5, 9.5, 1], af: [51.5, 9.5, -1] } }), 300, 900),
    ],
    cues: [
      'Dumbbells op schouderhoogte, ellebogen iets naar voren.',
      'Druk recht omhoog tot je armen gestrekt zijn.',
      'Buik aan, niet hol trekken in je onderrug.',
      'Zak gecontroleerd terug.',
    ],
  },
  {
    name: 'Shoulder press',
    mark: { joint: 'hN', label: 'recht omhoog', dx: 10, dy: 12 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 8 },
    view: 'front',
    props: [{ t: 'barbell' }],
    frames: [
      f(fStand({ ik: { an: [73, 32, 1], af: [47, 32, -1] } }), 300, 1300),
      f(fStand({ ik: { an: [70, 9.6, 1], af: [50, 9.6, -1] } }), 300, 900),
    ],
    cues: [
      'Stang of handvatten op schouderhoogte, polsen recht.',
      'Druk recht omhoog, hoofd iets naar achteren en weer terug.',
      'Buik en billen aan, niet achterover leunen.',
      'Zak gecontroleerd terug.',
    ],
  },

  // ----- core -----
  {
    name: 'Tuck L-sit',
    mark: { joint: 'sh', label: 'schouders omlaag', dx: -12, dy: -16 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 6 },
    props: [PAR_L],
    frames: [
      f(lsit([0, 0, 0], [0, 0, 0], { shrug: 2.5, at: ['sh', 58.5, 63.8], ik: { ...hands(59.3, 88), ln: [73, FOOT, -1], lf: [74.5, FOOT, -1] } }), 500, 900),
      f(lsit([0, 0, 40], [0, 0, 43], { ik: { ...hands(59.3, 88), ln: [68, 91, -1], lf: [69.5, 91, -1] } }), 1800, 900),
    ],
    key: 1,
    cues: [
      'Handen op de parallettes naast je heupen, armen gestrekt.',
      'Duw de grond weg: schouders omlaag, weg van je oren.',
      'Trek je knieën naar je borst en til je voeten op.',
      'Rug recht, kijk vooruit.',
    ],
    tip: 'Leun iets naar voren als je voeten de grond blijven raken.',
  },
  {
    name: 'One-leg L-sit',
    mark: { joint: 'aN', label: 'been gestrekt', dx: -4, dy: -16 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    props: [PAR_L],
    frames: [f(lsit(...tuckLegs), 600, 900), f(lsit([-2, -2, -2], tuckLegs[1]), 1800, 900)],
    key: 1,
    cues: [
      'Vanuit tuck L-sit: strek één been helemaal, tenen wijzen.',
      'Het andere been blijft getuckt.',
      'Schouders omlaag, armen op slot.',
      'Wissel per set van been.',
    ],
  },
  {
    name: 'L-sit',
    mark: { joint: 'kN', label: 'benen horizontaal', dx: 4, dy: -16 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    props: [PAR_L],
    frames: [f(lsit(...tuckLegs), 600, 900), f(lsit([-3, -3, -3], [-1, -1, -1]), 1800, 900)],
    key: 1,
    cues: [
      'Handen naast je heupen, armen gestrekt, schouders omlaag.',
      'Benen gestrekt en tegen elkaar, horizontaal.',
      'Tenen wijzen, knieën op slot.',
      'Duw de grond weg en houd je borst open.',
    ],
    tip: 'Zakken je benen? Werk aan hamstring-flexibiliteit (pike stretch) en compressie.',
  },
  {
    name: 'Compact leg lifts',
    mark: { joint: 'aN', label: 'hielen los', dx: 6, dy: -22 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -6 },
    frames: [
      f({ spine: [-62, -52], ln: [0, 0, -75], lf: [1, 1, -75], at: ['hip', 34, 94.8], ik: hands(54) }, 400, 900),
      f({ spine: [-60, -50], ln: [-14, -14, -89], lf: [-13, -13, -88], at: ['hip', 34, 94.8], ik: hands(54) }, 800, 700),
    ],
    cues: [
      'Zit rechtop, benen gestrekt, handen naast je knieën.',
      'Leun iets naar voren en til je hielen van de vloer.',
      'Knieën gestrekt, tenen wijzen.',
      'Even vasthouden, langzaam zakken.',
    ],
    tip: 'Hoe dichter je handen bij je voeten, hoe zwaarder.',
  },
  {
    name: 'Dragon flag negatives',
    mark: { joint: 'hip', label: 'niet knikken in je heupen', dx: 12, dy: -12 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -18 },
    props: [{ t: 'bench', x: 10, y: 80, w: 88 }],
    frames: [
      f({ spine: [90, 90], head: 180, ln: [-90, -90, -90], lf: [-91.5, -91.5, -91.5], at: ['sh', 30, 75.7], ik: hands(16, 78, 1) }, 500, 1000),
      f({ spine: [170, 170], head: 180, ln: [-10, -10, -10], lf: [-11.5, -11.5, -11.5], at: ['sh', 30, 75.7], ik: hands(16, 78, 1) }, 300, 3600),
    ],
    cues: [
      'Lig op een bank en houd hem achter je hoofd vast.',
      'Breng je lichaam recht omhoog: alleen je bovenrug ligt nog op de bank.',
      'Laat je lichaam als één plank zo langzaam mogelijk zakken.',
      'Niet knikken in je heupen; buig je knieën om terug te komen.',
    ],
    tip: 'Nog te zwaar? Doe hem met gebogen knieën (tuck dragon flag).',
  },
  {
    name: 'Hollow body hold',
    mark: { joint: 'hip', label: 'onderrug plat op de grond', dx: 4, dy: -22 },
    frames: [f({ spine: [-178, -160], head: -152, an: [-158, -158], af: [-156, -156], ln: [-14, -14, -14], lf: [-12.5, -12.5, -12.5], at: ['hip', 58, 95] })],
    cues: [
      'Lig op je rug, onderrug plat tegen de vloer.',
      'Til schouders en benen een stukje van de grond.',
      'Armen gestrekt naast je oren, tenen wijzen.',
      'Blijf ademen; je onderrug mag niet loskomen.',
    ],
    tip: 'Te zwaar? Buig je knieën of houd je armen bij je heupen.',
  },
  {
    name: 'Side plank',
    mark: { joint: 'hip', label: 'heup omhoog', dx: -6, dy: -18 },
    view: 'front',
    frames: [f({ spine: [-28, -28], w: 5.5, hw: 3.5, an: [90, 90], af: [-90, -90], ln: [153.5, 153.5, 100], lf: [153.5, 153.5, 100], at: ['hN', 84, 98] })],
    cues: [
      'Steun op je hand of onderarm, recht onder je schouder.',
      'Voeten op elkaar, lichaam in één rechte lijn.',
      'Duw je heup omhoog, niet laten zakken.',
      'Tijd per kant; wissel en doe beide kanten even lang.',
    ],
  },

  // ----- pull -----
  {
    name: 'Scapular pull-ups',
    mark: { joint: 'shN', label: 'schouders omlaag', dx: 22, dy: 4 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 0 },
    view: 'front',
    floor: false,
    vb: PULL_VB,
    props: [FBAR],
    frames: [f(fHang(), 600, 800), f({ ...fHang(), shrug: -1.5, at: ['sh', 60, 33.6] }, 800, 700)],
    cues: [
      'Hang met gestrekte armen aan de stang.',
      'Trek je schouders omlaag en iets naar achteren, zonder je armen te buigen.',
      'Je lichaam komt een paar centimeter omhoog, borst iets open.',
      'Laat gecontroleerd weer zakken tot een passieve hang.',
    ],
  },
  {
    name: 'Pull-ups',
    mark: { joint: 'head', label: 'kin over de stang', dx: 22, dy: -4 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 0 },
    view: 'front',
    floor: false,
    vb: PULL_VB,
    props: [FBAR],
    frames: [f(fHang(), 600, 1300), f(fTop(), 400, 850)],
    cues: [
      'Handen iets breder dan schouders, start in een volle hang.',
      'Trek eerst je schouders omlaag, dan je ellebogen naar je heupen.',
      'Kin over de stang, borst richting de stang.',
      'Gecontroleerd terug tot gestrekte armen.',
    ],
    tip: '3 minuten rust en stop 1 rep voor failure: dan blijven je latere sets sterk.',
  },
  {
    name: 'Pull-up negatives',
    mark: { joint: 'head', label: '± 5 sec zakken', dx: 22, dy: -4 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 0 },
    view: 'front',
    floor: false,
    vb: PULL_VB,
    props: [FBAR],
    frames: [f(fTop(), 700, 900), f(fHang(), 400, 5000)],
    cues: [
      'Spring of stap omhoog tot je kin boven de stang is.',
      'Zak zo langzaam mogelijk, ± 5 seconden.',
      'Houd je schouders actief, ook onderin.',
      'Helemaal tot gestrekte armen.',
    ],
  },
  {
    name: 'Explosive pull-ups',
    mark: { joint: 'sh', label: 'borst naar de stang', dx: 24, dy: 6 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 0 },
    view: 'front',
    floor: false,
    vb: PULL_VB,
    props: [FBAR],
    frames: [f(fHang(), 700, 1100), f(fTop(13, 7), 250, 420)],
    cues: [
      'Start in een volle hang, schouders actief.',
      'Trek zo snel en hoog mogelijk: borst naar de stang.',
      'Alleen nette reps, geen kip of zwaai.',
      'Gecontroleerd terug zakken.',
    ],
    tip: 'Dit bouwt de kracht voor de muscle-up: hoogte is belangrijker dan aantal.',
  },
  {
    name: 'Hammer grip pull-ups',
    mark: { joint: 'hN', label: 'handpalmen naar elkaar', dx: 14, dy: -8 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 0 },
    view: 'front',
    floor: false,
    vb: PULL_VB,
    props: [{ t: 'line', x1: 68, y1: 6, x2: 68, y2: 14, w: 3 }, { t: 'line', x1: 52, y1: 6, x2: 52, y2: 14, w: 3 }, { t: 'line', x1: 40, y1: 4, x2: 80, y2: 4, w: 2 }],
    frames: [f(fHang(8), 600, 1300), f(fTop(8, 9), 400, 850)],
    cues: [
      'Handpalmen naar elkaar toe (parallelle handvatten).',
      'Trek je ellebogen langs je lichaam omlaag.',
      'Kin boven de handvatten.',
      'Gecontroleerd terug tot gestrekte armen.',
    ],
    tip: 'Niet tot failure: je trekt op maandag al zwaar.',
  },
  {
    name: 'Advanced tuck front lever',
    mark: { joint: 'mid', label: 'rug plat en horizontaal', dx: 0, dy: 18 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 14 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [f(leverHang, 500, 1200), f(lever(-60, [-90, 0, 0], [-88, 2, 2]), 2400, 1300)],
    key: 1,
    cues: [
      'Armen gestrekt, trek je schouders omlaag (naar je heupen).',
      'Rug plat en horizontaal, heupen op schouderhoogte.',
      'Knieën 90° gebogen, dijen loodrecht op je romp.',
      'Duw de stang naar je heupen toe.',
    ],
    tip: 'Zakken je heupen? Trek je knieën iets dichter naar je borst.',
  },
  {
    name: 'One-leg front lever',
    mark: { joint: 'kN', label: 'been in lijn met je romp', dx: 6, dy: 18 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 14 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [f(leverHang, 500, 1200), f(lever(-54, [0, 0, 0], [-112, 25, 25]), 2400, 1300)],
    key: 1,
    cues: [
      'Als de advanced tuck, maar één been gestrekt.',
      'Gestrekte been in lijn met je romp, tenen wijzen.',
      'Rug plat, heupen hoog.',
      'Wissel per set van been.',
    ],
  },
  {
    name: 'Straddle front lever',
    mark: { joint: 'kN', label: 'benen wijd gespreid', dx: 6, dy: 18 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 14 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [f(leverHang, 500, 1200), f(lever(-50, [5, 5, 5], [-7, -7, -7]), 2400, 1300)],
    key: 1,
    cues: [
      'Benen gestrekt en wijd gespreid (straddle).',
      'Lichaam horizontaal, armen gestrekt.',
      'Schouders omlaag, billen aan.',
      'Hoe wijder je benen, hoe lichter.',
    ],
  },
  {
    name: 'Bodyweight rows',
    mark: { joint: 'hip', label: 'lichaam strak als een plank', dx: -4, dy: -24 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 8 },
    face: -1,
    props: [{ t: 'bar', x: 60, y: 66, post: true }],
    frames: [f(row(10, 97.6, -6.8, [60, 66], -80), 400, 1100), f(row(10, 97.6, -24.5, [60, 66], -98), 500, 900)],
    cues: [
      'Lage stang, hielen op de grond, lichaam strak als een plank.',
      'Trek je borst naar de stang, ellebogen langs je lichaam.',
      'Knijp bovenin je schouderbladen samen.',
      'Gecontroleerd terug tot gestrekte armen.',
    ],
    tip: 'Wordt het makkelijk? Leg je hielen op je box.',
  },
  {
    name: 'Bodyweight rows voeten verhoogd',
    mark: { joint: 'hip', label: 'heupen hoog, lichaam strak', dx: 0, dy: -24 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 8 },
    face: -1,
    props: [{ t: 'box', x: 0, y: 87, w: 24, h: 13, label: '30 cm' }, { t: 'bar', x: 68, y: 66, post: true }],
    frames: [f(row(12, 84.7, 7.1, [68, 66], -70), 400, 1100), f(row(12, 84.7, -10.5, [68, 66], -88), 600, 900)],
    cues: [
      'Hielen op je box (± 30 cm), stang zo laag dat je onderin net vrij van de grond hangt.',
      'Trek je borst naar de stang, ellebogen langs je lichaam.',
      'Knijp bovenin je schouderbladen 1 tel samen.',
      'Gecontroleerd terug tot gestrekte armen; heupen zakken niet door.',
    ],
    tip: 'Hoger dan ± 30 cm hoeft niet. Zwaarder maak je hem met de stang lager, 3 sec zakken, 2 sec vasthouden of extra gewicht.',
  },
  {
    name: 'Archer rows',
    mark: { joint: 'head', label: 'trek naar één hand', dx: 0, dy: -14 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -6 },
    view: 'top',
    floor: false,
    props: [{ t: 'line', x1: 20, y1: 40, x2: 100, y2: 40, w: 2.6 }],
    frames: [f(topView(60, 40), 400, 900), f(topView(52), 700, 1100), f(topView(60, 40), 400, 1100), f(topView(68), 700, 1100)],
    key: 1,
    cues: [
      'Zelfde opstelling als je rows met voeten op de box, maar pak de stang heel breed.',
      'Trek je borst naar één hand: die arm buigt, de andere blijft gestrekt.',
      'Lichaam strak, heupen draaien niet mee.',
      'Zak gecontroleerd en wissel van kant (reps per kant).',
    ],
    tip: 'Dit is de stap naar one-arm rows: je trekt bijna je hele gewicht met één arm, zonder dat je voeten hoger hoeven.',
  },
  {
    name: 'Bodyweight curls',
    mark: { joint: 'eN', label: 'alleen je ellebogen buigen', dx: -14, dy: -16 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 6 },
    face: -1,
    props: [{ t: 'bar', x: 72, y: 64, post: true }],
    frames: [f(row(10, 97.6, -6.2, [72, 64], -80), 400, 1100), f(row(10, 97.6, -20, [72, 64], -94), 500, 900)],
    cues: [
      'Onder een lage stang, handpalmen naar je toe.',
      'Buig alleen je ellebogen: breng je voorhoofd naar de stang.',
      'Bovenarmen blijven stil, lichaam strak.',
      'Gecontroleerd terug.',
    ],
  },
  {
    name: 'Pulldown',
    mark: { joint: 'hN', label: 'naar je bovenborst', dx: 16, dy: -2 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 8 },
    vb: [0, -6, 120, 111],
    props: [{ t: 'bench', x: 30, y: 81, w: 24 }, { t: 'box', x: 50, y: 64, w: 12, h: 5 }, { t: 'cable', x: 49, y: -6 }],
    frames: [
      f({ spine: [-95, -97], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 44, 76], ik: { an: [46, 23.5, 1], af: [47, 23.5, 1], ln: [62.5, FOOT, -1], lf: [64, FOOT, -1] } }, 300, 1100),
      f({ spine: [-102, -102], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 44, 76], ik: { an: [46.5, 48, 1], af: [47.5, 48, 1], ln: [62.5, FOOT, -1], lf: [64, FOOT, -1] } }, 400, 900),
    ],
    cues: [
      'Zit stevig, dijen onder het kussen.',
      'Trek de stang naar je bovenborst, ellebogen naar beneden.',
      'Borst open, iets achterover leunen.',
      'Gecontroleerd terug tot gestrekte armen.',
    ],
  },
  {
    name: 'Rows',
    mark: { joint: 'eN', label: 'ellebogen langs je lichaam', dx: 0, dy: -26 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 6 },
    props: [{ t: 'bench', x: 24, y: 84.5, w: 28 }, { t: 'box', x: 75.5, y: 78, w: 5, h: 22 }, { t: 'cable', x: 108, y: 66 }],
    frames: [
      f({ spine: [-80, -80], ln: [0, 0, -72], lf: [0, 0, -72], at: ['hip', 38, 80.5], ik: { an: [68.5, 62, 1], af: [69.5, 62, 1], ln: [72, 88, -1], lf: [72.5, 86.5, -1] } }, 300, 1100),
      f({ spine: [-90, -91], ln: [0, 0, -72], lf: [0, 0, -72], at: ['hip', 38, 80.5], ik: { an: [45, 70, 1], af: [46, 70, 1], ln: [72, 88, -1], lf: [72.5, 86.5, -1] } }, 500, 900),
    ],
    cues: [
      'Zit rechtop, knieën licht gebogen.',
      'Trek de handgreep naar je buik, ellebogen langs je lichaam.',
      'Knijp je schouderbladen samen.',
      'Gecontroleerd terug, zonder je rug rond te maken.',
    ],
  },
  {
    name: 'Muscle-up step 1 (false grip)',
    mark: { joint: 'hN', label: 'false grip: pols over de stang', dx: 14, dy: -8 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 10 },
    floor: false,
    vb: [0, -14, 120, 115],
    props: [BAR],
    frames: [f(hang(), 600, 1100), f(hang({ at: ['sh', 55, 13], spine: [-100, -100], ln: [72, 84, 50], lf: [75, 87, 53] }), 500, 650)],
    cues: [
      'False grip: je pols over de stang, de stang ligt in je handpalm.',
      'Trek explosief hoog: borst naar de stang.',
      'Houd de false grip vast bovenin.',
      'Gecontroleerd terug.',
    ],
    tip: 'Dit belast je onderarmen flink: altijd aan het eind van je training.',
  },
  {
    name: 'Muscle-up',
    mark: { joint: 'sh', label: 'borst over de stang', dx: 18, dy: -6 },
    arrow: { joint: 'sh', from: 0, to: 3, bend: 16 },
    floor: false,
    vb: [0, -40, 120, 145],
    props: [BAR],
    frames: [
      f(hang(), 500, 1100),
      f(hang({ at: ['sh', 55, 10], spine: [-105, -105], ln: [66, 76, 50], lf: [69, 79, 53] }), 0, 600),
      f(hang({ at: ['sh', 66, 2], spine: [-60, -60], ln: [100, 112, 80], lf: [103, 115, 83] }), 0, 420),
      f(hang({ at: ['sh', 61, -17], spine: [-84, -84], ln: [84, 88, 60], lf: [87, 91, 63] }), 900, 550),
    ],
    cues: [
      'Explosieve pull: trek de stang naar je onderborst/buik.',
      'Gooi je borst over de stang en draai je polsen eroverheen.',
      'Druk jezelf omhoog als bij een dip tot gestrekte armen.',
      'Gecontroleerd terug.',
    ],
    tip: 'Basis eerst: ± 10 nette pull-ups en explosieve chest-to-bar pull-ups.',
  },
  {
    name: 'Hollow body hang',
    mark: { joint: 'hip', label: 'billen aan, buik in', dx: 14, dy: 0 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [f(hang({ spine: [-84, -94], ln: [80, 80, 80], lf: [82, 82, 82] }))],
    cues: [
      'Hang aan de stang, schouders actief.',
      'Kantel je bekken: billen aan, buik in.',
      'Benen gestrekt, iets naar voren, tenen wijzen.',
      'Lichaam als een lichte banaan (holle rug naar voren).',
    ],
  },
  {
    name: 'German hang',
    mark: { joint: 'sh', label: 'schouders niet forceren', dx: 12, dy: 14 },
    arrow: { joint: 'hip', from: 1, to: 2, bend: -14 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [
      f(hang({ head: -90, ln: [-10, 100, 60], lf: [-7, 103, 63] }), 300, 1200),
      f(hang({ spine: [-270, -270], head: -270, ln: [-220, -80, -120], lf: [-217, -77, -117] }), 200, 1500),
      f(hang({ spine: [-420, -420], head: -402, at: ['sh', 66, 36.5], ln: [-285, -265, -300], lf: [-282, -262, -297] }), 2000, 1700),
    ],
    key: 2,
    cues: [
      'Vanuit hang: trek je knieën op en rol achterover tussen je armen door.',
      'Laat je benen aan de achterkant zakken tot je armen achter je hangen.',
      'Ontspan in de rek, schouders niet forceren.',
      'Kom rustig terug via dezelfde weg.',
    ],
    tip: 'Begin met je voeten op de grond (op ringen of een lage stang) om de rek te doseren.',
  },
  {
    name: 'Skin the cat',
    mark: { joint: 'eN', label: 'armen gestrekt', dx: 16, dy: -4 },
    arrow: { joint: 'hip', from: 1, to: 2, bend: -14 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [
      f(hang({ head: -90, ln: [-10, 100, 60], lf: [-7, 103, 63] }), 400, 1400),
      f(hang({ spine: [-270, -270], head: -270, ln: [-220, -80, -120], lf: [-217, -77, -117] }), 200, 1400),
      f(hang({ spine: [-420, -420], head: -402, at: ['sh', 66, 36.5], ln: [-285, -265, -300], lf: [-282, -262, -297] }), 700, 1400),
      f(hang({ spine: [-270, -270], head: -270, ln: [-220, -80, -120], lf: [-217, -77, -117] }), 200, 1400),
    ],
    key: 2,
    cues: [
      'Vanuit hang: knieën op, rol achterover tussen je armen door.',
      'Zak door tot German hang (armen achter je).',
      'Kom via dezelfde weg terug naar de hang.',
      'Langzaam en gecontroleerd, armen gestrekt.',
    ],
  },
  {
    name: 'Tuck back lever',
    mark: { joint: 'mid', label: 'rug horizontaal', dx: 0, dy: -18 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -10 },
    floor: false,
    vb: HANG_VB,
    props: [BAR],
    frames: [
      f(hang({ spine: [-270, -270], head: -270, ln: [-220, -80, -120], lf: [-217, -77, -117] }), 400, 1200),
      f(hang({ spine: [-360, -360], head: -352, at: ['sh', 75.5, 32.1], ln: [-300, -170, -170], lf: [-297, -167, -167] }), 2400, 1400),
    ],
    key: 1,
    cues: [
      'Vanuit omgekeerde hang (tuck): zak langzaam naar voren/beneden.',
      'Stop als je rug horizontaal is, gezicht naar de grond.',
      'Armen gestrekt, knieën strak getuckt.',
      'Schouders actief, niet doorzakken.',
    ],
    tip: 'Eerst German hang en skin the cat beheersen: dit is zwaar voor je schouders en biceps.',
  },

  // ----- mobility skills -----
  {
    name: 'Shoulder stand',
    mark: { joint: 'eN', label: 'ellebogen op de grond', dx: 14, dy: -10 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 10 },
    frames: [
      f({ spine: [179, 180], head: 180, ln: [-90, -90, -90], lf: [-91.5, -91.5, -91.5], at: ['sh', 44, 95.6], ik: hands(69.5, 97, 1) }, 500, 1100),
      f({ spine: [86, 86], head: 180, ln: [-88, -88, -88], lf: [-89.5, -89.5, -89.5], at: ['sh', 44, 95.6], ik: hands(49, 84, 1) }, 2200, 1200),
    ],
    key: 1,
    cues: [
      'Lig op je rug, benen omhoog.',
      'Til je heupen op en steun je onderrug met je handen.',
      'Ellebogen en bovenarmen op de grond, schouderbreed.',
      'Lichaam en benen zo recht mogelijk omhoog; nek ontspannen.',
    ],
    tip: 'Niet met je hoofd draaien zolang je erin staat.',
  },
  {
    name: 'Straddle sit',
    mark: { joint: 'sh', label: 'rug recht', dx: 18, dy: -8 },
    view: 'front',
    frames: [f({ spine: [-90, -90], w: 7, hw: 5, ln: [9, 9, -80], lf: [171, 171, -100], at: ['hip', 60, 93], ik: { an: [72, 90, -1], af: [48, 90, 1] } })],
    cues: [
      'Zit in spreidzit, benen gestrekt, knieën naar het plafond.',
      'Rug recht, zit op je zitbotjes (niet achterover).',
      'Handen licht op de grond naast je.',
      'Adem rustig en zak elke uitademing iets verder.',
    ],
  },
  {
    name: 'Pancake stretch',
    mark: { joint: 'mid', label: 'rug lang, reik naar voren', dx: 26, dy: 22 },
    view: 'top',
    floor: false,
    props: [{ t: 'mat', x: 10, y: 10, w: 100, h: 92 }],
    frames: [f({ spine: [-90, -90], w: 7, hw: 5, an: [-80, -86], af: [-100, -94], ln: [-32, -32, -32], lf: [-148, -148, -148], at: ['hip', 60, 84] })],
    cues: [
      'Zit in spreidzit, benen zo wijd als comfortabel, knieën omhoog.',
      'Kantel vanuit je heupen naar voren met een rechte rug.',
      'Reik met je handen naar voren over de grond.',
      'Adem uit en zak dieper, niet veren.',
    ],
  },
  {
    name: 'Pike stretch',
    mark: { joint: 'kN', label: 'knieën gestrekt', dx: -4, dy: 0 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -10 },
    frames: [
      f({ spine: [-90, -88], head: -85, ln: [0, 0, -80], lf: [1, 1, -80], at: ['hip', 34, 94.8], ik: { an: [50, 91, -1], af: [51, 91, -1] } }, 500, 1200),
      f({ spine: [-38, -12], head: 2, ln: [0, 0, -80], lf: [1, 1, -80], at: ['hip', 34, 94.8], ik: { an: [70, 88, -1], af: [71, 88, -1] } }, 2200, 1500),
    ],
    key: 1,
    cues: [
      'Zit met gestrekte benen tegen elkaar, tenen omhoog.',
      'Kantel vanuit je heupen naar voren, rug zo lang mogelijk.',
      'Reik naar je tenen; buik naar je dijen.',
      'Knieën gestrekt houden, adem rustig.',
    ],
  },
  // ----- legs -----
  {
    name: 'Pistol links negatives',
    mark: { joint: 'kN', label: 'knie boven je tenen', dx: 16, dy: -8 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 10 },
    frames: [f(pistolTop, 400, 1500), f(pistolBottom, 300, 4500)],
    cues: [
      'Sta op één been, ander been gestrekt naar voren, armen vooruit.',
      'Zak in ± 5 seconden zo diep mogelijk.',
      'Knie in lijn met je tenen, hiel blijft op de grond.',
      'Ga onderin op je box zitten of pak iets vast, en kom met twee benen omhoog.',
    ],
    tip: 'Zak naar je box of stepper als doel: elke paar weken een lagere hoogte, tot je zonder kunt.',
  },
  {
    name: 'Pistol links',
    mark: { joint: 'kN', label: 'knie boven je tenen', dx: 16, dy: -8 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 10 },
    frames: [f(pistolTop, 400, 1100), f(pistolBottom, 300, 1500)],
    cues: [
      'Sta op één been, ander been gestrekt naar voren, armen vooruit.',
      'Zak gecontroleerd tot je hamstring je kuit raakt.',
      'Knie in lijn met je tenen, hiel op de grond.',
      'Duw jezelf omhoog zonder te veren.',
    ],
  },
  {
    name: 'Pistol rechts',
    mark: { joint: 'kN', label: 'knie boven je tenen', dx: 16, dy: -8 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 10 },
    frames: [f(pistolTop, 400, 1100), f(pistolBottom, 1000, 1500)],
    cues: [
      'Sta op één been, ander been gestrekt naar voren, armen vooruit.',
      'Zak gecontroleerd, 1 seconde pauze onderin.',
      'Knie in lijn met je tenen, hiel op de grond.',
      'Duw jezelf omhoog zonder te veren.',
    ],
  },
  {
    name: 'Bulgarian split squat',
    mark: { joint: 'kN', label: 'knie boven je voet', dx: 12, dy: -16 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 8 },
    props: [{ t: 'bench', x: 6, y: 78, w: 30 }, { t: 'dumbbells' }],
    frames: [
      f({ spine: [-84, -84], an: [92, 88], af: [95, 91], ln: [0, 0, 0], lf: [0, 0, 172], at: ['hip', 54, 64], ik: { ln: [64, FOOT, -1], lf: [27, 76, -1] } }, 400, 1300),
      f({ spine: [-78, -78], an: [91, 87], af: [94, 90], ln: [0, 0, 0], lf: [0, 0, 172], at: ['hip', 50, 80], ik: { ln: [64, FOOT, -1], lf: [27, 76, -1] } }, 300, 1400),
    ],
    cues: [
      'Achterste voet op een bank, voorste voet een grote stap ervoor.',
      'Zak recht naar beneden tot je voorste dij ongeveer horizontaal is.',
      'Voorste knie boven je voet, romp iets voorover.',
      'Duw jezelf omhoog via je voorste hiel.',
    ],
    tip: 'Knie gaat naar binnen? Minder gewicht en bewust je knie naar buiten duwen.',
  },
  {
    name: 'Squats tempo',
    mark: { joint: 'kN', label: 'knieën boven je tenen', dx: 14, dy: -6 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 8 },
    props: [{ t: 'dumbbells' }],
    frames: [
      f({ spine: [-88, -88], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 58.5, 62.1], ik: { ln: [60, FOOT, -1], lf: [61.5, FOOT, -1], an: [66, 42.5, 1], af: [66.8, 42.5, 1] } }, 500, 900),
      f({ spine: [-62, -68], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 49.8, 84.1], ik: { ln: [60, FOOT, -1], lf: [61.5, FOOT, -1], an: [67, 64, 1], af: [67.8, 64, 1] } }, 1000, 3000),
    ],
    cues: [
      'Gewicht voor je borst (goblet), voeten iets breder dan heupbreedte.',
      'Zak in 3 seconden, knieën in lijn met je tenen.',
      '1 seconde pauze onderin, rug recht.',
      'Kom krachtig omhoog.',
    ],
  },
  {
    name: 'Reverse lunges',
    mark: { joint: 'kF', label: 'knie bijna op de grond', dx: -10, dy: -22 },
    arrow: { joint: 'aF', from: 0, to: 1, bend: 8 },
    frames: [
      f({ spine: [-89, -89], an: [93, 84], af: [90, 80], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 60, 62.2], ik: { ln: [62, FOOT, -1], lf: [58.5, FOOT, -1] } }, 400, 1000),
      f({ spine: [-86, -86], an: [97, 84], af: [86, 76], ln: [0, 0, 0], lf: [0, 0, 85], at: ['hip', 48, 79.5], ik: { ln: [62, FOOT, -1], lf: [23, TOE, -1] } }, 300, 1200),
    ],
    cues: [
      'Sta rechtop en stap met één been groot naar achteren.',
      'Zak tot je achterste knie bijna de grond raakt.',
      'Voorste knie boven je voet, romp rechtop.',
      'Duw terug via je voorste hiel en wissel van been.',
    ],
  },
  {
    name: 'Single leg calf raises',
    mark: { joint: 'aN', label: 'zo hoog mogelijk', dx: -18, dy: -4 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 0 },
    props: [{ t: 'stepper', x: 50, y: 90, w: 32 }, { t: 'wall', x: 86, from: 6 }],
    frames: [
      f({ spine: [-90, -90], ln: [90, 90, -20], lf: [96, 165, 120], at: ['aN', 48.3, 89.3], ik: { an: [84.5, 44, 1] } }, 500, 1000),
      f({ spine: [-90, -90], ln: [90, 90, 55], lf: [96, 165, 120], at: ['aN', 50.1, 83.5], ik: { an: [84.5, 38, 1] } }, 700, 800),
    ],
    cues: [
      'Sta op de bal van één voet op de rand van je stepper, hiel vrij.',
      'Laat je hiel zo ver mogelijk zakken.',
      'Kom zo hoog mogelijk op je tenen en houd 1 tel vast.',
      'Houd je vast aan de muur voor balans, niet om te helpen.',
    ],
  },
  {
    name: 'Reverse nordic partials',
    mark: { joint: 'hip', label: 'heupen gestrekt', dx: 16, dy: -8 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 10 },
    frames: [
      f({ spine: [-90, -90], an: [10, 0], af: [13, 3], ln: [90, 180, 180], lf: [91.5, 181, 181], at: ['kN', 62, 96.8] }, 400, 1000),
      f({ spine: [-122, -122], an: [-22, -32], af: [-19, -29], ln: [58, 180, 180], lf: [59.5, 181, 181], at: ['kN', 62, 96.8] }, 400, 1700),
    ],
    cues: [
      'Kniel met je knieën op een mat, tenen gestrekt.',
      'Lichaam recht van knie tot schouder, billen aan.',
      'Leun een stukje naar achteren zonder in je heupen te knikken.',
      'Kom terug met je bovenbenen; niet verder dan je kunt controleren.',
    ],
  },
  {
    name: 'Reverse nordic',
    mark: { joint: 'hip', label: 'heupen gestrekt', dx: 12, dy: -16 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 12 },
    frames: [
      f({ spine: [-90, -90], an: [10, 0], af: [13, 3], ln: [90, 180, 180], lf: [91.5, 181, 181], at: ['kN', 66, 96.8] }, 400, 1200),
      f({ spine: [-152, -152], an: [-52, -62], af: [-49, -59], ln: [28, 180, 180], lf: [29.5, 181, 181], at: ['kN', 66, 96.8] }, 400, 3000),
    ],
    cues: [
      'Kniel, lichaam recht van knie tot schouder.',
      'Leun langzaam zo ver mogelijk naar achteren, heupen gestrekt.',
      'Billen aan, niet in je heupen knikken.',
      'Kom terug met je bovenbenen.',
    ],
  },
  {
    name: 'Archer squats',
    mark: { joint: 'kN', label: 'zak naar één kant', dx: 10, dy: -24 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 6 },
    view: 'front',
    frames: [
      f({ spine: [-90, -90], w: 7, hw: 5, ln: [0, 0, 30], lf: [0, 0, 150], at: ['hip', 60, 67], ik: { ln: [82, FOOT, -1], lf: [38, FOOT, 1], an: [61.5, 54, -1], af: [58.5, 54, 1] } }, 400, 900),
      f({ spine: [-86, -86], w: 7, hw: 5, fs: { ln: 0.62 }, ln: [0, 0, 30], lf: [0, 0, 150], at: ['hip', 73, 83], ik: { ln: [82, FOOT, -1], lf: [37, FOOT, 1], an: [75.5, 70, -1], af: [72.5, 70, 1] } }, 600, 1300),
      f({ spine: [-90, -90], w: 7, hw: 5, ln: [0, 0, 30], lf: [0, 0, 150], at: ['hip', 60, 67], ik: { ln: [82, FOOT, -1], lf: [38, FOOT, 1], an: [61.5, 54, -1], af: [58.5, 54, 1] } }, 400, 1100),
      f({ spine: [-94, -94], w: 7, hw: 5, fs: { lf: 0.62 }, ln: [0, 0, 30], lf: [0, 0, 150], at: ['hip', 47, 83], ik: { ln: [83, FOOT, -1], lf: [38, FOOT, 1], an: [47.5, 70, -1], af: [44.5, 70, 1] } }, 600, 1300),
    ],
    key: 1,
    cues: [
      'Heel brede stand, tenen iets naar buiten.',
      'Zak naar één kant: die knie buigt, het andere been blijft gestrekt.',
      'Hielen op de grond, borst omhoog.',
      'Terug naar het midden en wissel van kant.',
    ],
  },
  {
    name: 'Sissy squats',
    mark: { joint: 'kN', label: 'knieën naar voren en omlaag', dx: 6, dy: -22 },
    arrow: { joint: 'kN', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [-90, -90], an: [20, 0], af: [23, 3], ln: [90, 90, 60], lf: [91.5, 91.5, 62], at: ['aN', 46, 94] }, 400, 1000),
      f({ spine: [-130, -130], an: [-20, -40], af: [-17, -37], ln: [50, 145, 60], lf: [51.5, 146, 62], at: ['aN', 46, 94] }, 300, 1600),
    ],
    cues: [
      'Sta op je tenen, houd eventueel iets vast voor balans.',
      'Duw je knieën naar voren en laat je lichaam naar achteren zakken.',
      'Rechte lijn van knie tot schouder, heupen gestrekt.',
      'Kom terug met je bovenbenen.',
    ],
    tip: 'Pijn in je knie? Minder diep en langzamer opbouwen.',
  },
  {
    name: 'Single-leg glute bridges',
    mark: { joint: 'hip', label: 'heup omhoog', dx: -4, dy: -22 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 0 },
    frames: [
      f({ spine: [178, 180], head: 180, an: [3, 3], af: [5, 5], ln: [0, 0, 0], lf: [-45, -45, -45], at: ['sh', 30, 95.6], ik: { ln: [74, FOOT, -1] } }, 400, 900),
      f({ spine: [150, 162], head: 180, an: [3, 3], af: [5, 5], ln: [0, 0, 0], lf: [-20, -20, -20], at: ['sh', 30, 95.6], ik: { ln: [74, FOOT, -1] } }, 900, 800),
    ],
    cues: [
      'Lig op je rug, één voet plat op de grond, het andere been gestrekt omhoog.',
      'Duw je heup omhoog via je hiel.',
      'Knijp bovenin je billen samen; rechte lijn van knie tot schouder.',
      'Langzaam zakken, heup net niet neerleggen.',
    ],
    tip: 'Zwaarder zonder extra gewicht: leg je schouders of je voet op je stepper.',
  },
  {
    name: 'Step-ups',
    mark: { joint: 'aN', label: 'hele voet op de box', dx: 14, dy: -12 },
    arrow: { joint: 'hip', from: 0, to: 2, bend: -8 },
    props: [{ t: 'box', x: 64, y: 78, w: 36, h: 22, label: 'box' }],
    frames: [
      f({ spine: [-82, -82], an: [80, 60], af: [105, 95], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 56, 62.6], ik: { ln: [72, 75.9, -1], lf: [52, FOOT, -1] } }, 300, 1000),
      f({ spine: [-85, -85], an: [92, 80], af: [92, 82], ln: [0, 0, 0], lf: [0, 0, 30], at: ['hip', 65, 50], ik: { ln: [72, 75.9, -1], lf: [59, 81, -1] } }, 0, 750),
      f({ spine: [-90, -90], an: [93, 86], af: [90, 84], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 73, 40], ik: { ln: [72, 75.9, -1], lf: [76, 75.9, -1] } }, 500, 650),
    ],
    cues: [
      'Zet je hele voet op de box.',
      'Duw jezelf omhoog via je voorste been, niet afzetten met het onderste.',
      'Sta bovenin helemaal rechtop.',
      'Stap gecontroleerd terug en wissel van been.',
    ],
    tip: 'Zwaarder: langzamer zakken (3 sec) of dumbbells erbij. Een hogere box hoeft niet.',
  },

  // ----- mobility -----
  {
    name: 'Cat cow',
    mark: { joint: 'mid', label: 'rug hol, dan rond', dx: -4, dy: -24 },
    arrow: { joint: 'mid', from: 0, to: 1, bend: 0 },
    frames: [f(quad([1.4, -36.4], -55), 900, 1300), f(quad([-36.4, 1.4], 62), 900, 1300)],
    cues: [
      'Handen onder je schouders, knieën onder je heupen.',
      'Cow: buik naar de grond, borst en blik omhoog.',
      'Cat: duw je rug rond naar het plafond, kin naar je borst.',
      'Beweeg langzaam mee met je ademhaling.',
    ],
  },
  {
    name: 'Cobra pose',
    mark: { joint: 'hip', label: 'heupen op de grond', dx: -10, dy: -16 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [-2, -2], head: -4, ln: [180, 180, 180], lf: [181, 181, 181], at: ['hip', 50, 95.6], ik: hands(72) }, 500, 1300),
      f({ spine: [-25, -62], head: -55, ln: [180, 180, 180], lf: [181, 181, 181], at: ['hip', 50, 95.6], ik: hands(72) }, 2000, 1300),
    ],
    key: 1,
    cues: [
      'Lig op je buik, handen naast je borst.',
      'Duw je borst omhoog, heupen blijven op de grond.',
      'Schouders laag, weg van je oren.',
      'Kijk vooruit en adem rustig.',
    ],
  },
  {
    name: "Child's pose",
    mark: { joint: 'hip', label: 'billen op je hielen', dx: -8, dy: -18 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -12 },
    frames: [
      f({ spine: [-90, -90], head: -90, ln: [30.7, 180, 180], lf: [32, 181, 181], at: ['kN', 62, 96.8], ik: hands(58, 86, -1) }, 400, 1300),
      f({ spine: [-8, 12], head: 40, ln: [30.7, 180, 180], lf: [32, 181, 181], at: ['kN', 62, 96.8], ik: hands(96.5, 98.3, -1) }, 2500, 1500),
    ],
    key: 1,
    cues: [
      'Kniel en ga met je billen op je hielen zitten.',
      'Buig voorover, armen gestrekt naar voren op de grond.',
      'Voorhoofd op de grond, ontspan je schouders.',
      'Adem diep in je rug.',
    ],
  },
  {
    name: 'Superman',
    mark: { joint: 'hN', label: 'armen en benen los', dx: -10, dy: -14 },
    frames: [
      f({ spine: [-2, -2], head: -2, an: [-1, -1], af: [0, 0], ln: [180, 180, 180], lf: [181, 181, 181], at: ['hip', 56, 95.8] }, 500, 900),
      f({ spine: [-8, -20], head: -26, an: [-24, -24], af: [-21, -21], ln: [190, 190, 190], lf: [192, 192, 192], at: ['hip', 56, 95.8] }, 1500, 900),
    ],
    key: 1,
    cues: [
      'Lig op je buik, armen gestrekt boven je hoofd.',
      'Til armen, borst en benen tegelijk een stukje op.',
      'Billen aan, kijk naar de grond (nek lang).',
      'Even vasthouden en rustig zakken.',
    ],
  },
  {
    name: 'Reverse snow angel',
    mark: { joint: 'hN', label: 'armen los van de grond', dx: 14, dy: -2 },
    arrow: { joint: 'hN', from: 0, to: 2, bend: 18 },
    view: 'top',
    floor: false,
    props: [{ t: 'mat', x: 18, y: 6, w: 84, h: 100 }],
    frames: [
      f({ spine: [-90, -90], w: 7, hw: 4, an: [78, 78], af: [102, 102], ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 42] }, 400, 1100),
      f({ spine: [-90, -90], w: 7, hw: 4, an: [0, 0], af: [180, 180], ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 42] }, 0, 1100),
      f({ spine: [-90, -90], w: 7, hw: 4, an: [-62, -62], af: [242, 242], ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 42] }, 400, 1100),
    ],
    cues: [
      'Lig op je buik, armen langs je lichaam, iets van de grond.',
      'Beweeg je armen in een grote boog naar boven je hoofd.',
      'Houd ze de hele tijd los van de grond, duimen omhoog.',
      'Langzaam terug naar je heupen.',
    ],
  },
  {
    name: 'Squat to pike',
    mark: { joint: 'sh', label: 'borst tegen je knieën', dx: 14, dy: -16 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [-66.8, -4.8], head: -28, ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 44, 87], ik: { ln: [58, FOOT, -1], lf: [59.5, FOOT, -1], an: [64, 98.3, -1], af: [65.5, 98.3, -1] } }, 500, 1300),
      f({ spine: [40.8, 89.4], head: 96, ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 52, 62.5], ik: { ln: [58, FOOT, -1], lf: [59.5, FOOT, -1], an: [64, 98.3, -1], af: [65.5, 98.3, -1] } }, 900, 1500),
    ],
    cues: [
      'Diepe hurk, pak je tenen vast of zet je handen onder je voeten.',
      'Borst tegen je knieën.',
      'Strek je benen zo ver als kan zonder je borst los te laten.',
      'Terug naar de hurk en herhaal.',
    ],
  },
  {
    name: 'Prayer squat',
    mark: { joint: 'eN', label: 'ellebogen duwen knieën uit', dx: 14, dy: -30 },
    view: 'front',
    frames: [f({ spine: [-90, -90], w: 7, hw: 5, fs: { ln: 0.85, lf: 0.85, sp: 0.8 }, ln: [0, 0, 35], lf: [0, 0, 145], at: ['hip', 60, 88], ik: { ln: [73, FOOT, -1], lf: [47, FOOT, 1], an: [61.2, 80, -1], af: [58.8, 80, 1] } })],
    cues: [
      'Diepe hurk, voeten iets breder dan heupbreedte.',
      'Handen tegen elkaar voor je borst.',
      'Duw met je ellebogen je knieën naar buiten.',
      'Hielen op de grond, borst omhoog.',
    ],
  },
  {
    name: 'Pols- en onderarmstretch',
    mark: { joint: 'hN', label: 'vingers naar je knieën', dx: 6, dy: -34 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -6 },
    fingers: -1,
    frames: [f(quad([-16.5, -16.5], -10, 61), 600, 1200), f(quad([-17.7, -17.7], -8, 61, 70), 1400, 1500)],
    cues: [
      'Op handen en knieën, draai je handen zodat je vingers naar je knieën wijzen.',
      'Handpalmen plat op de grond.',
      'Schommel rustig naar achteren tot je rek voelt.',
      'Ook met de handrug op de grond herhalen.',
    ],
  },
  {
    name: 'Zone 2',
    mark: { joint: 'head', label: 'praattempo', dx: 14, dy: -4 },
    props: [{ t: 'line', x1: 8, y1: 100, x2: 112, y2: 91.7, w: 2.5 }],
    frames: [
      f({ spine: [-84, -84], an: [108, 96], af: [68, 44], ln: [0, 0, -5], lf: [0, 0, 20], at: ['hip', 58, 59.6], ik: { ln: [70, 92.4, -1], lf: [45, 94.4, -1] } }, 0, 380),
      f({ spine: [-84, -84], an: [90, 78], af: [88, 74], ln: [0, 0, -5], lf: [0, 0, 30], at: ['hip', 58, 58.2], ik: { ln: [57, 93.5, -1], lf: [59, 86, -1] } }, 0, 380),
      f({ spine: [-84, -84], an: [68, 44], af: [108, 96], ln: [0, 0, 20], lf: [0, 0, -5], at: ['hip', 58, 59.6], ik: { ln: [45, 94.4, -1], lf: [70, 92.4, -1] } }, 0, 380),
      f({ spine: [-84, -84], an: [88, 74], af: [90, 78], ln: [0, 0, 30], lf: [0, 0, -5], at: ['hip', 58, 58.2], ik: { ln: [59, 86, -1], lf: [57, 93.5, -1] } }, 0, 380),
    ],
    cues: [
      'Wandelen op een helling (± 10%) of rustig fietsen/hiken.',
      'Tempo waarbij je nog volzinnen kunt praten.',
      'Niet aan de leuning hangen.',
      '25–40 minuten aaneengesloten.',
    ],
  },
];

const bySlug = new Map(GUIDES.map((g) => [g.name.trim().toLowerCase(), g]));

export function guideFor(name: string | undefined): Guide | undefined {
  return name ? bySlug.get(name.trim().toLowerCase()) : undefined;
}

export const VIEW_LABEL: Record<NonNullable<Guide['view']>, string> = {
  side: 'Zijaanzicht',
  front: 'Vooraanzicht',
  top: 'Bovenaanzicht',
};
