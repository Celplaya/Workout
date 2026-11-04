import type { Frame, Joint, Pose } from './figure';

// Exercise guides: an animated stick figure plus short form cues, matched to
// exercises by name. Coordinates: viewBox 0 0 120 105, floor at y = 100,
// the figure faces right. Angles: 0 = right, 90 = down, -90 = up.

export type Prop =
  | { t: 'bar'; x: number; y: number }
  | { t: 'wall'; x: number; from?: number; to?: number }
  | { t: 'box'; x: number; y: number; w: number; h: number }
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
}

const f = (p: Pose, hold?: number, tween?: number): Frame => ({ p, hold, tween });

// ---------- shared poses ----------

const BAR = { t: 'bar', x: 60, y: 10 } as const;
const onBar = { an: [60, 10, 1], af: [61.5, 10, 1] } as Pose['ik'];

const hang = (o: Partial<Pose> = {}): Pose => ({
  spine: [-90, -90], ln: [90, 90], lf: [93, 93], at: ['sh', 60, 37.2], ik: onBar, ...o,
});
const pullTop = (o: Partial<Pose> = {}): Pose => ({
  spine: [-97, -97], ln: [80, 86], lf: [83, 90], at: ['sh', 56, 12], ik: onBar, ...o,
});

const hand = (x: number, y = 99, b = 1): [number, number, number] => [x, y, b];

// Front-lever family: hang → lever (anchor on the near hand).
const lever = (ln: number[], lf: number[], spine: [number, number] = [-180, -180]): Pose => ({
  spine, an: [-73, -73], af: [-71, -71], ln, lf, at: ['hN', 60, 10],
});
const leverHang: Pose = { spine: [-90, -90], an: [-90, -90], af: [-88, -88], ln: [90, 90], lf: [93, 93], at: ['hN', 60, 10] };

// Planche family
const pushTop: Pose = { spine: [-22, -22], ln: [158, 158, 90], lf: [158, 158, 92], at: ['aN', 8, 95], ik: { an: hand(65.5), af: hand(67) } };
const lean: Pose = { spine: [-20, -14], ln: [160, 160, 95], lf: [160, 160, 97], at: ['aN', 17, 95], ik: { an: hand(65.5), af: hand(67) } };
const PAR = { t: 'box', x: 55, y: 92, w: 18, h: 8 } as const;

// Quadruped (hands and knees)
const quad = (spine: [number, number], head?: number, thigh = 90): Pose => ({
  spine, head, ln: [thigh, 180, 180], lf: [thigh + 2, 180, 180], at: ['kN', 32, 96],
  ik: { an: hand(58), af: hand(59.5) },
});

// Seated L-sit family on parallettes
const PAR_L = { t: 'box', x: 52, y: 86, w: 16, h: 14 } as const;
const lsit = (ln: number[], lf: number[], spine: [number, number] = [-92, -90]): Pose => ({
  spine, ln, lf, at: ['sh', 60, 59.2], ik: { an: [60, 86, 1], af: [61.5, 86, 1] },
});

// Pistol (near leg is the standing leg)
const pistolTop: Pose = { spine: [-88, -88], an: [0, 0], af: [2, 2], ln: [90, 90], lf: [28, 28, 28], at: ['aN', 56, 97] };
const pistolBottom: Pose = { spine: [-52, -58], an: [-2, -2], af: [0, 0], ln: [-15, 112], lf: [-6, -6, -6], at: ['aN', 56, 97] };

// Inverted rows
const row = (spine: number, foot: number): Pose => ({
  spine: [spine, spine], ln: [spine + 180, spine + 180, foot], lf: [spine + 181, spine + 181, foot],
  at: ['aN', 10, 96], ik: { an: [70, 60, 1], af: [71.5, 60, 1] },
});

// Handstand
const hs = (x: number, o: Partial<Pose> = {}): Pose => ({
  spine: [90, 90], ln: [-90, -90, -90], lf: [-92, -92, -92], at: ['sh', x, 72.2],
  ik: { an: hand(x + 2.5), af: hand(x - 2.5) }, ...o,
});

const FBAR = { t: 'line', x1: 28, y1: 10, x2: 92, y2: 10, w: 3 } as const;
const fHang = (hx = 18): Pose => ({ spine: [-90, -90], w: 7, hw: 4, ln: [91, 91, 90], lf: [89, 89, 90], at: ['sh', 60, 10 + Math.sqrt(27 * 27 - (hx - 7) * (hx - 7)) - 0.3], ik: { an: [60 + hx, 10, 1], af: [60 - hx, 10, -1] } });
const fTop = (hx = 18, y = 12): Pose => ({ spine: [-90, -90], w: 7, hw: 4, ln: [93, 85, 90], lf: [87, 95, 90], at: ['sh', 60, y], ik: { an: [60 + hx, 10, 1], af: [60 - hx, 10, -1] } });

// ---------- guides ----------

export const GUIDES: Guide[] = [
  // ----- handstand -----
  {
    name: 'Chest-to-wall handstand',
    mark: { joint: 'mid', label: 'buik in, billen aan', dx: -10, dy: 0 },
    props: [{ t: 'wall', x: 69.5 }],
    frames: [f(hs(64))],
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
    mark: { joint: 'hN', label: 'druk de vloer weg', dx: 16, dy: -14 },
    arrow: { joint: 'aF', from: 1, to: 2, bend: -10 },
    frames: [
      f({ spine: [-90, -90], an: [-92, -92], af: [-90, -90], at: ['hip', 50, 66], ik: { ln: [64, 97, -1], lf: [36, 97, -1] } }, 500, 1100),
      f({ spine: [62, 70], lf: [-125, -125, -125], at: ['hip', 62, 50], ik: { an: hand(78.5), af: hand(73.5), ln: [60, 97, -1] } }, 0, 800),
      f(hs(76), 1800, 700),
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
    mark: { joint: 'head', label: 'hoofd iets vóór je handen', dx: 14, dy: -4 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 8 },
    props: [{ t: 'wall', x: 51 }],
    frames: [
      f(hs(60, { spine: [88, 88], ln: [-94, -94, -94], lf: [-95, -95, -95], at: ['sh', 60.5, 72.3] }), 400, 1000),
      f(hs(60, { spine: [80, 82], ln: [-96, -96, -96], lf: [-97, -97, -97], at: ['sh', 63, 81] }), 300, 1300),
    ],
    cues: [
      'Handstand met je rug naar de muur, handen ± 15 cm van de muur.',
      'Zak gecontroleerd tot halverwege: je hoofd gaat iets vóór je handen (driehoek).',
      'Ellebogen schuin naar achteren, niet wijd uit.',
      'Druk jezelf terug tot gestrekte armen.',
    ],
    tip: 'Leg een opgevouwen handdoek of kussen onder je hoofd als stopmoment; maak hem dunner als je sterker wordt.',
  },
  {
    name: 'Wall HSPU',
    mark: { joint: 'head', label: 'hoofd iets vóór je handen', dx: 14, dy: -4 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 8 },
    props: [{ t: 'wall', x: 51 }],
    frames: [
      f(hs(60, { spine: [88, 88], ln: [-94, -94, -94], lf: [-95, -95, -95], at: ['sh', 60.5, 72.3] }), 400, 1000),
      f(hs(60, { spine: [78, 80], ln: [-97, -97, -97], lf: [-98, -98, -98], at: ['sh', 64, 86] }), 250, 1700),
    ],
    cues: [
      'Handstand met je rug naar de muur, handen ± 15 cm van de muur.',
      'Zak tot je hoofd licht de grond raakt, iets vóór je handen.',
      'Ellebogen schuin naar achteren, lichaam blijft strak.',
      'Druk door tot gestrekte armen, schouders naar je oren.',
    ],
    tip: 'Niet met je hoofd op de grond leunen: alleen even aantikken.',
  },

  // ----- balance / planche -----
  {
    name: 'Elbow lever',
    mark: { joint: 'eN', label: 'ellebogen tegen je heupen', dx: 0, dy: -26 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [-10, -8], head: -15, an: [168, 90], af: [170, 90], ln: [157, 157, 180], lf: [159, 159, 180], at: ['hN', 62, 99] }, 700, 1000),
      f({ spine: [0, -2], head: -8, an: [170, 90], af: [172, 90], ln: [180, 180, 180], lf: [181, 181, 181], at: ['hN', 62, 99] }, 2200, 1300),
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
    mark: { joint: 'kN', label: 'knieën op je bovenarmen', dx: -6, dy: -30 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -6 },
    frames: [
      f({ spine: [-40, -10], head: 10, ln: [0, 0], lf: [0, 0], at: ['hip', 50, 86], ik: { an: hand(68), af: hand(69.5), ln: [54, 97, -1], lf: [55.5, 97, -1] } }, 600, 1000),
      f({ spine: [12, 38], head: 15, ln: [36, -138], lf: [38, -134], at: ['hip', 55, 70], ik: { an: hand(73), af: hand(74.5) } }, 2000, 1100),
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
    mark: { joint: 'sh', label: 'schouders vóór je handen', dx: -3, dy: -24 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -9 },
    frames: [f(pushTop, 500, 1000), f(lean, 2000, 1200)],
    key: 1,
    cues: [
      'Start in push-up positie, armen gestrekt en ellebogen op slot.',
      'Leun naar voren tot je schouders vóór je handen zijn (op je tenen).',
      'Duw de grond weg: schouders naar voren en omlaag, bovenrug licht rond.',
      'Billen en buik aan, lichaam recht.',
    ],
    tip: 'Vingers mogen naar opzij of achteren wijzen; dat spaart je polsen. Warm je polsen eerst op.',
  },
  {
    name: 'Tuck planche',
    mark: { joint: 'eN', label: 'armen op slot', dx: -16, dy: -18 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 6 },
    props: [PAR],
    frames: [
      f({ spine: [-30, -5], head: 20, ln: [0, 0], lf: [0, 0], at: ['hip', 48, 80], ik: { an: [64, 92, 1], af: [65.5, 92, 1], ln: [56, 97, -1], lf: [57.5, 97, -1] } }, 500, 1000),
      f({ spine: [-25, 25], head: 30, ln: [40, -145, 180], lf: [42, -143, 180], at: ['sh', 72, 67], ik: { an: [64, 92, 1], af: [65.5, 92, 1] } }, 1800, 1000),
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
    mark: { joint: 'mid', label: 'rug plat', dx: 0, dy: -18 },
    arrow: { joint: 'kN', from: 0, to: 1, bend: 6 },
    props: [PAR],
    frames: [
      f({ spine: [-25, 25], head: 30, ln: [40, -145, 180], lf: [42, -143, 180], at: ['sh', 72, 67], ik: { an: [64, 92, 1], af: [65.5, 92, 1] } }, 900, 1000),
      f({ spine: [3, 3], head: 20, ln: [90, 180, 180], lf: [92, 182, 182], at: ['sh', 73, 67], ik: { an: [64, 92, 1], af: [65.5, 92, 1] } }, 1800, 1200),
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
    mark: { joint: 'sh', label: 'schouders naar voren', dx: 0, dy: -20 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [38, 42], ln: [112, 112, 90], lf: [113, 113, 92], at: ['aN', 22, 95], ik: { an: hand(65.5), af: hand(67) } }, 500, 1100),
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
    mark: { joint: 'eN', label: 'ellebogen naar achteren', dx: -18, dy: -16 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -12 },
    floor: false,
    props: [{ t: 'line', x1: 40, y1: 55.5, x2: 84, y2: 55.5, w: 3 }, { t: 'line', x1: 80, y1: 55.5, x2: 80, y2: 104, w: 2 }, { t: 'weight' }],
    frames: [
      f({ spine: [-80, -82], ln: [96, 150], lf: [98, 152], at: ['sh', 63, 28.7], ik: { an: [60, 55, 1], af: [61.5, 55, 1] } }, 400, 1000),
      f({ spine: [-70, -74], ln: [100, 155], lf: [102, 157], at: ['sh', 67, 41], ik: { an: [60, 55, 1], af: [61.5, 55, 1] } }, 300, 1300),
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
    frames: [
      f({ spine: [-90, -90], w: 7, hw: 4, ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 40], ik: { an: [90, 40, 1], af: [30, 40, -1] } }, 400, 900),
      f({ spine: [-90, -90], w: 7, hw: 4, ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 53, 41], ik: { an: [90, 40, 1], af: [30, 40, -1] } }, 600, 1100),
      f({ spine: [-90, -90], w: 7, hw: 4, ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 40], ik: { an: [90, 40, 1], af: [30, 40, -1] } }, 400, 1100),
      f({ spine: [-90, -90], w: 7, hw: 4, ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 67, 41], ik: { an: [90, 40, 1], af: [30, 40, -1] } }, 600, 1100),
    ],
    key: 1,
    cues: [
      'Handen heel breed, vingers schuin naar buiten.',
      'Zak naar één kant: die arm buigt, de andere blijft gestrekt.',
      'Lichaam strak als bij een gewone push-up.',
      'Duw terug naar het midden en wissel van kant.',
    ],
    tip: 'Te zwaar? Leg de gestrekte hand op een verhoging, of begin met minder diepte.',
  },
  {
    name: 'Pseudo planche push-ups',
    mark: { joint: 'eN', label: 'ellebogen langs je lichaam', dx: -4, dy: -24 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -6 },
    frames: [
      f(lean, 300, 1000),
      f({ spine: [-8, -6], ln: [172, 172, 92], lf: [172, 172, 94], at: ['aN', 17, 95], ik: { an: hand(65.5), af: hand(67) } }, 300, 1300),
    ],
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
    mark: { joint: 'head', label: 'hoofd vóór je handen', dx: 14, dy: -6 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -6 },
    props: [{ t: 'box', x: 6, y: 78, w: 28, h: 22 }],
    frames: [
      f({ spine: [78, 80], ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 45, 47], ik: { ln: [24, 75, 1], lf: [25.5, 75, 1], an: hand(58), af: hand(59.5) } }, 300, 1000),
      f({ spine: [86, 92], head: 45, ln: [0, 0, 0], lf: [0, 0, 0], at: ['hip', 54.5, 60], ik: { ln: [24, 75, 1], lf: [25.5, 75, 1], an: hand(58), af: hand(59.5) } }, 300, 1300),
    ],
    cues: [
      'Voeten op een verhoging, heupen hoog boven je handen.',
      'Zak met je hoofd naar een punt iets vóór je handen (driehoek).',
      'Ellebogen schuin naar achteren.',
      'Duw terug tot gestrekte armen.',
    ],
    tip: 'Hoe hoger je voeten en hoe verticaler je romp, hoe dichter bij een handstand push-up.',
  },
  {
    name: 'Bodyweight skull crusher',
    mark: { joint: 'eN', label: 'ellebogen wijzen naar voren', dx: 10, dy: -26 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 6 },
    props: [{ t: 'box', x: 80, y: 81, w: 26, h: 19 }],
    frames: [
      f({ spine: [-30, -30], ln: [150, 150, 90], lf: [150, 150, 92], at: ['aN', 10, 95], ik: { an: [84, 81, 1], af: [85.5, 81, 1] } }, 300, 1000),
      f({ spine: [-18, -18], ln: [162, 162, 92], lf: [162, 162, 94], at: ['aN', 10, 95], ik: { an: [84, 81, 1], af: [85.5, 81, 1] } }, 300, 1300),
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
    mark: { joint: 'hN', label: 'naar je bovenborst', dx: 14, dy: 2 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 6 },
    props: [{ t: 'line', x1: 34, y1: 88, x2: 52, y2: 60, w: 5 }, { t: 'line', x1: 34, y1: 88, x2: 34, y2: 100, w: 3 }, { t: 'plate' }],
    frames: [
      f({ spine: [-56, -56], ln: [0, 90], lf: [2, 92], at: ['hip', 42, 81], ik: { an: [66, 61, 1], af: [67, 61, 1] } }, 300, 1300),
      f({ spine: [-56, -56], ln: [0, 90], lf: [2, 92], at: ['hip', 42, 81], ik: { an: [62, 31, 1], af: [63, 31, 1] } }, 400, 1000),
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
    mark: { joint: 'hN', label: 'recht omhoog', dx: 10, dy: -2 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 8 },
    view: 'front',
    props: [{ t: 'dumbbells' }],
    frames: [
      f({ spine: [-90, -90], w: 7, hw: 4, at: ['hip', 60, 64], ik: { ln: [64.5, 98.5, 1], lf: [55.5, 98.5, -1], an: [81, 23, 1], af: [39, 23, -1] } }, 300, 1200),
      f({ spine: [-90, -90], w: 7, hw: 4, at: ['hip', 60, 64], ik: { ln: [64.5, 98.5, 1], lf: [55.5, 98.5, -1], an: [70, 10, 1], af: [50, 10, -1] } }, 300, 900),
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
    mark: { joint: 'hN', label: 'recht omhoog', dx: 10, dy: -2 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 8 },
    view: 'front',
    props: [{ t: 'barbell' }],
    frames: [
      f({ spine: [-90, -90], w: 7, hw: 4, at: ['hip', 60, 64], ik: { ln: [64.5, 98.5, 1], lf: [55.5, 98.5, -1], an: [82, 25, 1], af: [38, 25, -1] } }, 300, 1200),
      f({ spine: [-90, -90], w: 7, hw: 4, at: ['hip', 60, 64], ik: { ln: [64.5, 98.5, 1], lf: [55.5, 98.5, -1], an: [70, 10, 1], af: [50, 10, -1] } }, 300, 900),
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
    mark: { joint: 'sh', label: 'schouders omlaag', dx: 12, dy: -8 },
    arrow: { joint: 'kN', from: 0, to: 1, bend: -6 },
    props: [PAR_L],
    frames: [
      f({ ...lsit([0, 0], [0, 0]), ik: { an: [60, 86, 1], af: [61.5, 86, 1], ln: [74, 97, -1], lf: [75.5, 97, -1] } }, 500, 900),
      f(lsit([-50, 100], [-48, 102]), 1800, 900),
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
    mark: { joint: 'aN', label: 'been gestrekt', dx: 0, dy: -14 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    props: [PAR_L],
    frames: [f(lsit([-50, 100], [-48, 102]), 600, 900), f(lsit([-2, -2, -2], [-48, 102]), 1800, 900)],
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
    mark: { joint: 'aN', label: 'benen horizontaal', dx: -6, dy: -16 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    props: [PAR_L],
    frames: [f(lsit([-50, 100], [-48, 102]), 600, 900), f(lsit([-3, -3, -3], [-1, -1, -1], [-94, -92]), 1800, 900)],
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
    mark: { joint: 'aN', label: 'hielen los', dx: 10, dy: -22 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -6 },
    frames: [
      f({ spine: [-62, -60], ln: [0, 0, -40], lf: [1, 1, -40], at: ['hip', 40, 95], ik: { an: hand(58), af: hand(59.5) } }, 400, 900),
      f({ spine: [-55, -52], ln: [-14, -14, -40], lf: [-13, -13, -40], at: ['hip', 40, 95], ik: { an: hand(58), af: hand(59.5) } }, 800, 700),
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
    mark: { joint: 'hip', label: 'niet knikken in je heupen', dx: 10, dy: -14 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -18 },
    props: [{ t: 'box', x: 12, y: 78, w: 64, h: 5 }, { t: 'line', x1: 18, y1: 83, x2: 18, y2: 100 }, { t: 'line', x1: 70, y1: 83, x2: 70, y2: 100 }],
    frames: [
      f({ spine: [90, 90], head: 180, ln: [-90, -90, -90], lf: [-92, -92, -92], at: ['sh', 28, 74], ik: { an: [16, 77, 1], af: [17, 77, 1] } }, 500, 1000),
      f({ spine: [172, 174], head: 180, ln: [-8, -8, -8], lf: [-7, -7, -7], at: ['sh', 28, 74], ik: { an: [16, 77, 1], af: [17, 77, 1] } }, 300, 3500),
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
    mark: { joint: 'mid', label: 'onderrug plat', dx: 0, dy: -16 },
    frames: [f({ spine: [-170, -162], an: [-166, -166], af: [-164, -164], ln: [-12, -12, -12], lf: [-11, -11, -11], at: ['hip', 62, 96] })],
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
    mark: { joint: 'hip', label: 'heup omhoog', dx: -4, dy: -18 },
    view: 'front',
    frames: [f({ spine: [-24, -24], w: 6, hw: 2.5, an: [90, 90], af: [-90, -90], ln: [156, 156, 180], lf: [154, 154, 180], at: ['hN', 82, 99] })],
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
    mark: { joint: 'sh', label: 'schouders omlaag', dx: 18, dy: 4 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [f(hang({ neck: 0 }), 500, 700), f(hang({ neck: 4.5, spine: [-93, -97] }), 700, 700)],
    cues: [
      'Hang met gestrekte armen aan de stang.',
      'Trek je schouders omlaag en iets naar achteren, zonder je armen te buigen.',
      'Je lichaam komt een paar centimeter omhoog, borst iets open.',
      'Laat gecontroleerd weer zakken tot een passieve hang.',
    ],
  },
  {
    name: 'Pull-ups',
    mark: { joint: 'head', label: 'kin over de stang', dx: 21, dy: -5 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 22 },
    view: 'front',
    floor: false,
    vb: [0, -16, 120, 121],
    props: [FBAR],
    frames: [f(fHang(), 600, 1200), f(fTop(), 400, 800)],
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
    mark: { joint: 'head', label: '± 5 sec zakken', dx: 21, dy: -5 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 22 },
    view: 'front',
    floor: false,
    vb: [0, -16, 120, 121],
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
    mark: { joint: 'sh', label: 'borst naar de stang', dx: 22, dy: 0 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 22 },
    view: 'front',
    floor: false,
    vb: [0, -16, 120, 121],
    props: [FBAR],
    frames: [f(fHang(), 700, 1000), f(fTop(18, 5), 300, 450)],
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
    mark: { joint: 'hN', label: 'handpalmen naar elkaar', dx: 14, dy: -6 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 20 },
    view: 'front',
    floor: false,
    vb: [0, -16, 120, 121],
    props: [FBAR],
    frames: [f(fHang(9), 600, 1200), f(fTop(9), 400, 800)],
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
    mark: { joint: 'mid', label: 'rug plat en horizontaal', dx: 4, dy: 16 },
    arrow: { joint: 'kN', from: 0, to: 1, bend: 12 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [f(leverHang, 500, 1200), f(lever([-90, 0, 0], [-88, 2, 2]), 2400, 1300)],
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
    mark: { joint: 'aN', label: 'been in lijn met je romp', dx: -6, dy: 14 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 12 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [f(leverHang, 500, 1200), f(lever([0, 0, 0], [-88, 2, 2]), 2400, 1300)],
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
    mark: { joint: 'aN', label: 'benen wijd gespreid', dx: -6, dy: 14 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 12 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [f(leverHang, 500, 1200), f(lever([0, 0, 0], [4, 4, 4]), 2400, 1300)],
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
    mark: { joint: 'mid', label: 'lichaam strak als een plank', dx: 0, dy: -18 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -8 },
    props: [{ t: 'bar', x: 70, y: 60 }],
    frames: [f(row(-8, -98), 400, 1000), f(row(-33, -123), 400, 900)],
    cues: [
      'Lage stang, hielen op de grond, lichaam strak als een plank.',
      'Trek je borst naar de stang, ellebogen langs je lichaam.',
      'Knijp bovenin je schouderbladen samen.',
      'Gecontroleerd terug tot gestrekte armen.',
    ],
    tip: 'Wordt het makkelijk? Leg je voeten op een verhoging.',
  },
  {
    name: 'Bodyweight rows voeten verhoogd',
    mark: { joint: 'mid', label: 'lichaam horizontaal en strak', dx: 0, dy: -18 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: -8 },
    props: [{ t: 'bar', x: 74, y: 62 }, { t: 'box', x: 0, y: 82, w: 24, h: 18 }],
    frames: [
      f({ ...row(8.5, -81), ln: [188.5, 188.5, -81], lf: [189.5, 189.5, -81], at: ['aN', 12, 80], ik: { an: [74, 62, 1], af: [75.5, 62, 1] } }, 400, 1000),
      f({ ...row(-11, -101), ln: [169, 169, -101], lf: [170, 170, -101], at: ['aN', 12, 80], ik: { an: [74, 62, 1], af: [75.5, 62, 1] } }, 400, 900),
    ],
    cues: [
      'Voeten op een verhoging, lichaam horizontaal en strak.',
      'Trek je borst naar de stang.',
      'Schouderbladen samen, ellebogen langs je lichaam.',
      'Gecontroleerd terug.',
    ],
  },
  {
    name: 'Bodyweight curls',
    mark: { joint: 'eN', label: 'alleen je ellebogen buigen', dx: -10, dy: -14 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -6 },
    props: [{ t: 'bar', x: 70, y: 60 }],
    frames: [
      f(row(-8, -98), 400, 1000),
      f({ ...row(-22, -112), ik: { an: [70, 60, -1], af: [71.5, 60, -1] } }, 400, 900),
    ],
    cues: [
      'Onder een lage stang, handpalmen naar je toe.',
      'Buig alleen je ellebogen: breng je voorhoofd naar de stang.',
      'Bovenarmen blijven stil, lichaam strak.',
      'Gecontroleerd terug.',
    ],
  },
  {
    name: 'Pulldown',
    mark: { joint: 'hN', label: 'naar je bovenborst', dx: 14, dy: -2 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 8 },
    props: [{ t: 'box', x: 30, y: 78, w: 22, h: 5 }, { t: 'line', x1: 41, y1: 83, x2: 41, y2: 100 }, { t: 'cable', x: 44, y: 0 }],
    frames: [
      f({ spine: [-98, -100], ln: [0, 95], lf: [2, 97], at: ['hip', 42, 76], ik: { an: [44, 22, 1], af: [45, 22, 1] } }, 300, 900),
      f({ spine: [-104, -106], ln: [0, 95], lf: [2, 97], at: ['hip', 42, 76], ik: { an: [46, 47, 1], af: [47, 47, 1] } }, 400, 900),
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
    mark: { joint: 'eN', label: 'ellebogen langs je lichaam', dx: 0, dy: -22 },
    arrow: { joint: 'hN', from: 0, to: 1, bend: 6 },
    props: [{ t: 'box', x: 26, y: 84, w: 26, h: 6 }, { t: 'box', x: 80, y: 82, w: 6, h: 18 }, { t: 'cable', x: 100, y: 70 }],
    frames: [
      f({ spine: [-75, -75], at: ['hip', 38, 82], ik: { ln: [79, 90, -1], lf: [79.5, 90, -1], an: [70, 66, 1], af: [71, 66, 1] } }, 300, 1000),
      f({ spine: [-90, -92], at: ['hip', 38, 82], ik: { ln: [79, 90, -1], lf: [79.5, 90, -1], an: [48, 68, 1], af: [49, 68, 1] } }, 500, 900),
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
    mark: { joint: 'hN', label: 'false grip', dx: 14, dy: 0 },
    arrow: { joint: 'sh', from: 0, to: 1, bend: 12 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [f(hang(), 600, 1000), f(pullTop({ at: ['sh', 53, 6], spine: [-108, -104], ln: [70, 78], lf: [72, 80] }), 500, 700)],
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
    mark: { joint: 'head', label: 'borst over de stang', dx: 16, dy: -4 },
    arrow: { joint: 'sh', from: 0, to: 3, bend: 16 },
    floor: false,
    vb: [0, -40, 120, 145],
    props: [BAR],
    frames: [
      f(hang(), 500, 1100),
      f(pullTop({ at: ['sh', 52, 6], spine: [-110, -106], ln: [66, 72], lf: [68, 74] }), 0, 600),
      f(pullTop({ at: ['sh', 64, -2], spine: [-58, -62], ln: [100, 110], lf: [102, 112] }), 0, 400),
      f(pullTop({ at: ['sh', 64, -16], spine: [-80, -82], ln: [96, 104], lf: [98, 106] }), 900, 500),
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
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [f(hang({ spine: [-86, -93], ln: [81, 81, 81], lf: [83, 83, 83] }))],
    cues: [
      'Hang aan de stang, schouders actief.',
      'Kantel je bekken: billen aan, buik in.',
      'Benen gestrekt, iets naar voren, tenen wijzen.',
      'Lichaam als een lichte banaan (holle rug naar voren).',
    ],
  },
  {
    name: 'German hang',
    mark: { joint: 'sh', label: 'schouders niet forceren', dx: 12, dy: 12 },
    arrow: { joint: 'hip', from: 0, to: 2, bend: 20 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [
      f(hang({ ln: [0, 90], lf: [2, 92] }), 300, 1100),
      f(hang({ spine: [-270, -270], ln: [120, -150], lf: [122, -148] }), 200, 1500),
      f(hang({ spine: [-420, -420], head: 15, at: ['sh', 66, 36.5], ln: [110, 80], lf: [112, 82] }), 2000, 1700),
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
    mark: { joint: 'hN', label: 'armen gestrekt', dx: 16, dy: 4 },
    arrow: { joint: 'hip', from: 0, to: 2, bend: 20 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [
      f(hang({ ln: [0, 90], lf: [2, 92] }), 400, 1300),
      f(hang({ spine: [-270, -270], ln: [120, -150], lf: [122, -148] }), 200, 1400),
      f(hang({ spine: [-420, -420], head: 15, at: ['sh', 66, 36.5], ln: [110, 80], lf: [112, 82] }), 700, 1400),
      f(hang({ spine: [-270, -270], ln: [120, -150], lf: [122, -148] }), 200, 1400),
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
    mark: { joint: 'mid', label: 'rug horizontaal', dx: 0, dy: 20 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 10 },
    floor: false,
    vb: [0, -10, 120, 115],
    props: [BAR],
    frames: [
      f({ spine: [-270, -270], ln: [120, -150], lf: [122, -148], at: ['hN', 60, 10], an: [-90, -90], af: [-88, -88] }, 400, 1200),
      f({ spine: [-360, -360], head: 0, ln: [62, -132, 180], lf: [64, -130, 180], at: ['hN', 60, 10], an: [-107, -107], af: [-105, -105] }, 2400, 1300),
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
    mark: { joint: 'eN', label: 'ellebogen op de grond', dx: 14, dy: -8 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [180, 180], head: 180, an: [0, 0], af: [1, 1], ln: [-90, -90, -90], lf: [-92, -92, -92], at: ['sh', 44, 95] }, 500, 1100),
      f({ spine: [90, 90], head: 180, an: [0, -140], af: [1, -138], ln: [-90, -90, -90], lf: [-92, -92, -92], at: ['sh', 44, 95] }, 2200, 1100),
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
    mark: { joint: 'sh', label: 'rug recht', dx: 16, dy: -6 },
    view: 'front',
    frames: [f({ spine: [-90, -90], w: 7, hw: 5, ln: [10, 10, -80], lf: [170, 170, -100], at: ['hip', 60, 94], ik: { an: [74, 99, 1], af: [46, 99, -1] } })],
    cues: [
      'Zit in spreidzit, benen gestrekt, knieën naar het plafond.',
      'Rug recht, zit op je zitbotjes (niet achterover).',
      'Handen licht op de grond naast je.',
      'Adem rustig en zak elke uitademing iets verder.',
    ],
  },
  {
    name: 'Pancake stretch',
    mark: { joint: 'head', label: 'rug lang, reik naar voren', dx: 0, dy: 14 },
    view: 'top',
    floor: false,
    props: [{ t: 'mat', x: 12, y: 14, w: 96, h: 90 }],
    frames: [f({ spine: [90, 90], head: 90, w: 7, hw: 5, an: [84, 84], af: [96, 96], ln: [38, 38, 38], lf: [142, 142, 142], at: ['hip', 60, 24] })],
    cues: [
      'Zit in spreidzit, benen zo wijd als comfortabel, knieën omhoog.',
      'Kantel vanuit je heupen naar voren met een rechte rug.',
      'Reik met je handen naar voren over de grond.',
      'Adem uit en zak dieper, niet veren.',
    ],
  },
  {
    name: 'Pike stretch',
    mark: { joint: 'kN', label: 'knieën gestrekt', dx: 0, dy: -14 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -10 },
    frames: [
      f({ spine: [-90, -90], an: [-82, -82], af: [-80, -80], ln: [0, 0, -80], lf: [1, 1, -80], at: ['hip', 36, 95] }, 500, 1200),
      f({ spine: [-28, -5], ln: [0, 0, -80], lf: [1, 1, -80], at: ['hip', 36, 95], ik: { an: [72, 90, 1], af: [73, 90, 1] } }, 2200, 1500),
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
    mark: { joint: 'kN', label: 'knie boven je tenen', dx: 20, dy: -6 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -10 },
    frames: [f(pistolTop, 400, 1500), f(pistolBottom, 300, 4500)],
    cues: [
      'Sta op één been, ander been gestrekt naar voren, armen vooruit.',
      'Zak in ± 5 seconden zo diep mogelijk.',
      'Knie in lijn met je tenen, hiel blijft op de grond.',
      'Kom omhoog met hulp (deurpost, TRX of twee benen).',
    ],
    tip: 'Hiel komt los? Leg een klein schijfje onder je hiel of houd iets vast.',
  },
  {
    name: 'Pistol links',
    mark: { joint: 'kN', label: 'knie boven je tenen', dx: 20, dy: -6 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -10 },
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
    mark: { joint: 'kN', label: 'knie boven je tenen', dx: 20, dy: -6 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -10 },
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
    mark: { joint: 'kN', label: 'knie boven je voet', dx: 14, dy: -14 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 8 },
    props: [{ t: 'box', x: 6, y: 72, w: 26, h: 28 }, { t: 'dumbbells' }],
    frames: [
      f({ spine: [-84, -84], an: [92, 90], af: [94, 92], lf: [0, 0, 160], at: ['hip', 54, 65], ik: { ln: [65, 97, -1], lf: [27, 69, -1] } }, 400, 1300),
      f({ spine: [-78, -78], an: [90, 90], af: [92, 92], lf: [0, 0, 160], at: ['hip', 48, 80], ik: { ln: [65, 97, -1], lf: [27, 69, -1] } }, 300, 1300),
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
    mark: { joint: 'kN', label: 'knieën boven je tenen', dx: 16, dy: -4 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 8 },
    props: [{ t: 'dumbbells' }],
    frames: [
      f({ spine: [-90, -90], at: ['hip', 57, 63], ik: { ln: [59, 97, -1], lf: [60.5, 97, -1], an: [63, 45, -1], af: [64, 45, -1] } }, 500, 900),
      f({ spine: [-58, -64], at: ['hip', 44, 84], ik: { ln: [59, 97, -1], lf: [60.5, 97, -1], an: [66, 66, -1], af: [67, 66, -1] } }, 1000, 3000),
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
    mark: { joint: 'kF', label: 'knie bijna op de grond', dx: -14, dy: -18 },
    arrow: { joint: 'aF', from: 0, to: 1, bend: 8 },
    frames: [
      f({ spine: [-90, -90], an: [88, 86], af: [92, 90], lf: [0, 0, 0], at: ['hip', 56, 64], ik: { ln: [60, 97, -1], lf: [58, 97, -1] } }, 400, 1000),
      f({ spine: [-86, -86], an: [92, 90], af: [88, 86], lf: [0, 0, 70], at: ['hip', 50, 80], ik: { ln: [63, 97, -1], lf: [30, 95, -1] } }, 300, 1100),
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
    mark: { joint: 'aN', label: 'zo hoog mogelijk', dx: -18, dy: 0 },
    arrow: { joint: 'aN', from: 0, to: 1, bend: 6 },
    props: [{ t: 'box', x: 57, y: 84, w: 24, h: 16 }, { t: 'wall', x: 82, from: 10, to: 84 }],
    frames: [
      f({ spine: [-90, -90], ln: [0, 0, -35], lf: [95, 150], at: ['hip', 55, 53.5], ik: { ln: [55, 87.5, -1], an: [80, 30, -1] } }, 300, 900),
      f({ spine: [-90, -90], ln: [0, 0, 60], lf: [95, 150], at: ['hip', 56.5, 45.7], ik: { ln: [56.5, 79.7, -1], an: [80, 26, -1] } }, 600, 800),
    ],
    cues: [
      'Sta op de bal van één voet op de rand van een trede, hiel vrij.',
      'Laat je hiel zo ver mogelijk zakken.',
      'Kom zo hoog mogelijk op je tenen.',
      'Houd je vast aan de muur voor balans, niet om te helpen.',
    ],
  },
  {
    name: 'Reverse nordic partials',
    mark: { joint: 'hip', label: 'heupen gestrekt', dx: 16, dy: 0 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 10 },
    frames: [
      f({ spine: [-90, -90], an: [0, 0], af: [2, 2], ln: [90, 180, 180], lf: [92, 182, 182], at: ['kN', 60, 96] }, 400, 1000),
      f({ spine: [-122, -122], an: [-32, -32], af: [-30, -30], ln: [58, 180, 180], lf: [60, 182, 182], at: ['kN', 60, 96] }, 400, 1600),
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
    mark: { joint: 'hip', label: 'heupen gestrekt', dx: 16, dy: 0 },
    arrow: { joint: 'head', from: 0, to: 1, bend: 12 },
    frames: [
      f({ spine: [-90, -90], an: [0, 0], af: [2, 2], ln: [90, 180, 180], lf: [92, 182, 182], at: ['kN', 60, 96] }, 400, 1200),
      f({ spine: [-152, -152], an: [-62, -62], af: [-60, -60], ln: [28, 180, 180], lf: [30, 182, 182], at: ['kN', 60, 96] }, 400, 3000),
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
    mark: { joint: 'head', label: 'zak naar één kant', dx: 16, dy: -6 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: 6 },
    view: 'front',
    frames: [
      f({ spine: [-90, -90], w: 7, hw: 5, an: [80, 80], af: [100, 100], at: ['hip', 60, 67], ik: { ln: [82, 97, -1], lf: [38, 97, 1] } }, 400, 900),
      f({ spine: [-96, -96], w: 7, hw: 5, an: [80, 80], af: [100, 100], at: ['hip', 45, 82], ik: { ln: [82, 97, -1], lf: [38, 97, 1] } }, 600, 1200),
      f({ spine: [-90, -90], w: 7, hw: 5, an: [80, 80], af: [100, 100], at: ['hip', 60, 67], ik: { ln: [82, 97, -1], lf: [38, 97, 1] } }, 400, 1200),
      f({ spine: [-84, -84], w: 7, hw: 5, an: [80, 80], af: [100, 100], at: ['hip', 75, 82], ik: { ln: [82, 97, -1], lf: [38, 97, 1] } }, 600, 1200),
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
    mark: { joint: 'kN', label: 'knieën naar voren', dx: 12, dy: -10 },
    arrow: { joint: 'kN', from: 0, to: 1, bend: 8 },
    frames: [
      f({ spine: [-90, -90], an: [0, 0], af: [2, 2], ln: [0, 0, 70], lf: [0, 0, 70], at: ['hip', 44, 61], ik: { ln: [44, 95, -1], lf: [45.5, 95, -1] } }, 400, 1000),
      f({ spine: [-115, -115], an: [-22, -22], af: [-20, -20], ln: [0, 0, 70], lf: [0, 0, 70], at: ['hip', 53, 72.7], ik: { ln: [44, 95, -1], lf: [45.5, 95, -1] } }, 300, 1500),
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
    mark: { joint: 'hip', label: 'heup omhoog', dx: 0, dy: -18 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -6 },
    frames: [
      f({ spine: [180, 180], head: 180, an: [0, 0], af: [1, 1], lf: [-40, -40, -40], at: ['sh', 30, 95], ik: { ln: [72, 97, -1] } }, 400, 900),
      f({ spine: [146, 160], head: 180, an: [0, 0], af: [1, 1], lf: [-27, -27, -27], at: ['sh', 30, 95], ik: { ln: [72, 97, -1] } }, 800, 800),
    ],
    cues: [
      'Lig op je rug, één voet plat op de grond, het andere been gestrekt omhoog.',
      'Duw je heup omhoog via je hiel.',
      'Knijp bovenin je billen samen; rechte lijn van knie tot schouder.',
      'Langzaam zakken, heup net niet neerleggen.',
    ],
  },
  {
    name: 'Step-ups',
    mark: { joint: 'aN', label: 'hele voet op de box', dx: 10, dy: -14 },
    arrow: { joint: 'hip', from: 0, to: 2, bend: -10 },
    props: [{ t: 'box', x: 64, y: 72, w: 32, h: 28 }],
    frames: [
      f({ spine: [-86, -86], lf: [0, 0, 0], at: ['hip', 54, 64], ik: { ln: [71, 69, -1], lf: [52, 97, -1] } }, 300, 900),
      f({ spine: [-88, -88], lf: [0, 0, 0], at: ['hip', 66, 46], ik: { ln: [71, 69, -1], lf: [62, 78, -1] } }, 0, 700),
      f({ spine: [-90, -90], lf: [0, 0, 0], at: ['hip', 72, 37], ik: { ln: [72, 69, -1], lf: [75.5, 69, -1] } }, 400, 600),
    ],
    cues: [
      'Zet je hele voet op de box.',
      'Duw jezelf omhoog via je voorste been, niet afzetten met het onderste.',
      'Sta bovenin helemaal rechtop.',
      'Stap gecontroleerd terug en wissel van been.',
    ],
  },

  // ----- mobility -----
  {
    name: 'Cat cow',
    mark: { joint: 'mid', label: 'rug hol, dan rond', dx: 0, dy: -20 },
    arrow: { joint: 'mid', from: 0, to: 1, bend: 8 },
    frames: [f(quad([12, -38], -45), 900, 1300), f(quad([-40, 14], 75), 900, 1300)],
    cues: [
      'Handen onder je schouders, knieën onder je heupen.',
      'Cow: buik naar de grond, borst en blik omhoog.',
      'Cat: duw je rug rond naar het plafond, kin naar je borst.',
      'Beweeg langzaam mee met je ademhaling.',
    ],
  },
  {
    name: 'Cobra pose',
    mark: { joint: 'hip', label: 'heupen op de grond', dx: -10, dy: -12 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [0, 0], head: 0, an: [0, 0], ln: [180, 180, 180], lf: [181, 181, 181], at: ['hip', 54, 96], ik: { an: [79, 99, 1], af: [80, 99, 1] } }, 500, 1300),
      f({ spine: [-22, -58], head: -50, ln: [180, 180, 180], lf: [181, 181, 181], at: ['hip', 54, 96], ik: { an: [79, 99, 1], af: [80, 99, 1] } }, 2000, 1300),
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
    mark: { joint: 'hip', label: 'billen op je hielen', dx: -6, dy: -16 },
    arrow: { joint: 'head', from: 0, to: 1, bend: -14 },
    frames: [
      f({ spine: [-90, -90], an: [-95, -95], af: [-93, -93], ln: [90, 180, 180], lf: [92, 182, 182], at: ['kN', 62, 96] }, 400, 1300),
      f({ spine: [12, 18], head: 10, an: [0, 0], af: [1, 1], ln: [30, 180, 180], lf: [32, 182, 182], at: ['kN', 62, 96] }, 2500, 1500),
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
    mark: { joint: 'hN', label: 'armen en benen los', dx: -8, dy: -12 },
    frames: [
      f({ spine: [0, 0], head: 0, an: [0, 0], af: [1, 1], ln: [180, 180, 180], lf: [181, 181, 181], at: ['hip', 54, 96] }, 400, 900),
      f({ spine: [-6, -12], head: -14, an: [-14, -14], af: [-12, -12], ln: [188, 188, 188], lf: [189, 189, 189], at: ['hip', 54, 96] }, 1500, 900),
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
      f({ spine: [-90, -90], w: 7, hw: 4, an: [80, 80], af: [100, 100], ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 40] }, 400, 1100),
      f({ spine: [-90, -90], w: 7, hw: 4, an: [0, 0], af: [180, 180], ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 40] }, 0, 1100),
      f({ spine: [-90, -90], w: 7, hw: 4, an: [-60, -60], af: [240, 240], ln: [91, 91, 91], lf: [89, 89, 89], at: ['sh', 60, 40] }, 400, 1100),
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
    mark: { joint: 'sh', label: 'borst tegen je knieën', dx: 14, dy: -8 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -8 },
    frames: [
      f({ spine: [-38, -55], head: -40, at: ['hip', 50, 90], ik: { ln: [58, 97, -1], lf: [59.5, 97, -1], an: [66, 99, 1], af: [67.5, 99, 1] } }, 500, 1300),
      f({ spine: [40, 65], head: 70, at: ['hip', 44, 66], ik: { ln: [58, 97, -1], lf: [59.5, 97, -1], an: [66, 99, 1], af: [67.5, 99, 1] } }, 900, 1500),
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
    mark: { joint: 'eN', label: 'ellebogen duwen knieën uit', dx: 18, dy: -22 },
    view: 'front',
    frames: [f({ spine: [-90, -90], w: 7, hw: 5, at: ['hip', 60, 82], ik: { ln: [76, 97, -1], lf: [44, 97, 1], an: [61.5, 65, 1], af: [58.5, 65, -1] } })],
    cues: [
      'Diepe hurk, voeten iets breder dan heupbreedte.',
      'Handen tegen elkaar voor je borst.',
      'Duw met je ellebogen je knieën naar buiten.',
      'Hielen op de grond, borst omhoog.',
    ],
  },
  {
    name: 'Pols- en onderarmstretch',
    mark: { joint: 'hN', label: 'vingers naar je knieën', dx: 4, dy: -32 },
    arrow: { joint: 'hip', from: 0, to: 1, bend: -6 },
    frames: [f(quad([-14, -14]), 600, 1200), f(quad([-10, -16], undefined, 70), 1200, 1500)],
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
      f({ spine: [-84, -84], an: [104, 100], af: [70, 50], at: ['hip', 58, 61], ik: { ln: [70, 93.4, -1], lf: [46, 95.1, -1] } }, 0, 380),
      f({ spine: [-84, -84], an: [90, 85], af: [90, 85], at: ['hip', 58, 59.5], ik: { ln: [56, 94.2, -1], lf: [60, 86, -1] } }, 0, 380),
      f({ spine: [-84, -84], an: [70, 50], af: [104, 100], at: ['hip', 58, 61], ik: { ln: [46, 95.1, -1], lf: [70, 93.4, -1] } }, 0, 380),
      f({ spine: [-84, -84], an: [90, 85], af: [90, 85], at: ['hip', 58, 59.5], ik: { ln: [60, 86, -1], lf: [56, 94.2, -1] } }, 0, 380),
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
