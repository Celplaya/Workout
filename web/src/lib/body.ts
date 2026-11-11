import type { Solved, V } from './figure';

// Turns a solved skeleton into body shapes (SVG path data): tapered limbs, a
// torso with chest and hips, neck, head, hands and feet. Each group is drawn
// as an outline pass plus a fill pass, so overlapping parts stay readable.

export type HandKind = 'flat' | 'fist' | 'open';

export interface BodyOptions {
  /** 1 = chest on the +normal side of the spine, -1 = the other side. */
  face: 1 | -1;
  /** Half shoulder / hip width (0 in side view). */
  w: number;
  hw: number;
  side: boolean;
  /** y of the floor, or null. Hands resting on it are drawn flat. */
  floor: number | null;
  grip: boolean;
  /** Direction (±1 along x) flat hands point to; default follows the chest/head. */
  fingers?: 1 | -1;
  /** 0..1 breathing phase offset for the chest. */
  breath?: number;
}

export interface Body {
  farArm: string[];
  farLeg: string[];
  core: string[];
  head: string[];
  eye: V | null;
  nearLeg: string[];
  nearArm: string[];
}

const n2 = (v: number) => v.toFixed(2);
const pt = (p: V) => `${n2(p[0])},${n2(p[1])}`;
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const perp = (a: V): V => [-a[1], a[0]];

export function circle(c: V, r: number): string {
  return `M${n2(c[0] - r)},${n2(c[1])}a${r},${r} 0 1 0 ${2 * r},0a${r},${r} 0 1 0 ${-2 * r},0Z`;
}

/** Tapered capsule from a (radius ra) to b (radius rb). */
export function capsule(a: V, b: V, ra: number, rb: number): string {
  const d = sub(b, a);
  if (Math.hypot(d[0], d[1]) < 0.05) return circle(a, Math.max(ra, rb));
  const n = perp(unit(d));
  return (
    `M${pt(add(a, n, ra))}L${pt(add(b, n, rb))}A${rb},${rb} 0 0 0 ${pt(add(b, n, -rb))}` +
    `L${pt(add(a, n, -ra))}A${ra},${ra} 0 0 0 ${pt(add(a, n, ra))}Z`
  );
}

const KEYS = [0, 0.32, 0.72, 1];
// Half widths hip → waist → chest → shoulder.
const FRONT = [3.7, 3.6, 5.3, 3.5]; // belly / chest side
const BACK = [4.9, 3.8, 4.5, 3.9]; // glutes / back side
const WIDE = [3.3, 1.5, 2.7, 2.5]; // added outside the hip / shoulder joints in front view

function profile(p: number[], t: number): number {
  for (let i = 1; i < KEYS.length; i++) {
    if (t <= KEYS[i]) {
      const k = (t - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      const e = k * k * (3 - 2 * k);
      return p[i - 1] + (p[i] - p[i - 1]) * e;
    }
  }
  return p[p.length - 1];
}

function torso(s: Solved, o: BodyOptions): string[] {
  const { hip, mid, sh } = s;
  // Quadratic curve through the mid-spine point.
  const c: V = [2 * mid[0] - (hip[0] + sh[0]) / 2, 2 * mid[1] - (hip[1] + sh[1]) / 2];
  const k = Math.min(1, o.w / 6);
  const N = 10;
  const a: V[] = [];
  const b: V[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const p: V = [u * u * hip[0] + 2 * u * t * c[0] + t * t * sh[0], u * u * hip[1] + 2 * u * t * c[1] + t * t * sh[1]];
    const tan = unit([2 * u * (c[0] - hip[0]) + 2 * t * (sh[0] - c[0]), 2 * u * (c[1] - hip[1]) + 2 * t * (sh[1] - c[1])]);
    const n = perp(tan);
    const lat = o.hw + (o.w - o.hw) * t + profile(WIDE, t);
    const chest = 1 + (o.breath ?? 0) * (t > 0.4 ? 0.05 : 0);
    const f = (1 - k) * profile(FRONT, t) * chest + k * lat;
    const r = (1 - k) * profile(BACK, t) + k * lat;
    a.push(add(p, n, o.face * f));
    b.push(add(p, n, -o.face * r));
  }
  const d = 'M' + a.map(pt).join('L') + 'L' + b.reverse().map(pt).join('L') + 'Z';
  if (k > 0.5) return [d];
  return [d, circle(sh, 3.4), circle(hip, 3.6)];
}

function hand(e: V, h: V, kind: HandKind, fx: number): string {
  if (kind === 'fist') return circle(h, 2.15);
  if (kind === 'flat') return capsule([h[0] - 0.8 * fx, h[1] + 0.3], [h[0] + 3.6 * fx, h[1] + 0.5], 1.5, 1.15);
  const d = unit(sub(h, e));
  return capsule(add(h, d, 0.6), add(h, d, 3.6), 1.75, 1.25);
}

function handKind(h: V, o: BodyOptions): HandKind {
  if (o.floor !== null && h[1] > o.floor - 3 && h[1] < o.floor + 0.5) return o.side ? 'flat' : 'fist';
  return o.grip ? 'fist' : 'open';
}

function arm(sh: V, e: V, h: V, o: BodyOptions, fx: number): string[] {
  return [capsule(sh, e, 2.9, 2.35), capsule(e, h, 2.35, 1.75), hand(e, h, handKind(h, o), fx)];
}

function leg(hip: V, k: V, a: V, t: V): string[] {
  const shin = unit(sub(a, k));
  const toe = unit(sub(t, a));
  // Sole stays flat: the smaller toe circle shifts toward the sole side
  // (the part of the shin direction that is perpendicular to the foot).
  const dot = shin[0] * toe[0] + shin[1] * toe[1];
  const sole: V = [shin[0] - dot * toe[0], shin[1] - dot * toe[1]];
  return [
    capsule(hip, k, 3.9, 2.9),
    capsule(k, a, 2.9, 1.85),
    capsule(add(a, toe, -1.1), add(add(t, toe, 0.4), sole, 0.55), 1.85, 1.3),
  ];
}

export function body(s: Solved, o: BodyOptions): Body {
  const up = unit(sub(s.sh, s.mid));
  const f: V = [-up[1] * o.face, up[0] * o.face];
  const headUp = unit(sub(s.head, s.sh));
  const hf: V = o.side ? [-headUp[1] * o.face, headUp[0] * o.face] : f;
  const head = [capsule(s.sh, s.head, 2.3, 2.3), circle(s.head, 5.2)];
  const fx = o.fingers ?? (f[0] + up[0] * 0.5 < 0 ? -1 : 1);
  if (o.side) head.push(capsule(add(add(s.head, hf, 3.6), headUp, -0.6), add(add(s.head, hf, 6.1), headUp, -1.1), 1.6, 0.9));
  return {
    farArm: arm(s.shF, s.eF, s.hF, o, fx),
    farLeg: leg(s.hipF, s.kF, s.aF, s.tF),
    core: torso(s, o),
    head,
    eye: o.side ? add(add(s.head, hf, 2.9), headUp, 0.9) : null,
    nearLeg: leg(s.hipN, s.kN, s.aN, s.tN),
    nearArm: arm(s.shN, s.eN, s.hN, o, fx),
  };
}
