// Stick-figure model for the exercise guides.
//
// A pose is a set of absolute segment angles (degrees; 0 = right, 90 = down,
// -90 = up, as in SVG) plus one anchored joint. Hands and feet that must stay
// on a bar, the floor or a bench are pinned with two-bone IK, so contacts stay
// exact while the figure animates between poses.

export type V = [number, number];
export type Limb = 'an' | 'af' | 'ln' | 'lf';
export type Joint =
  | 'hip' | 'mid' | 'sh' | 'shN' | 'shF' | 'head'
  | 'eN' | 'hN' | 'eF' | 'hF' | 'kN' | 'aN' | 'kF' | 'aF';

export interface Pose {
  /** [lower spine, upper spine]: hip → mid → shoulder. */
  spine: [number, number];
  /** Direction of the head from the shoulder (default: along the upper spine). */
  head?: number;
  neck?: number;
  /** [upper arm, forearm] near / far. */
  an?: number[];
  af?: number[];
  /** [thigh, shin, foot?] near / far. Foot defaults to shin − 90 (toes forward). */
  ln?: number[];
  lf?: number[];
  /** Half shoulder / hip width, for front and top views. */
  w?: number;
  hw?: number;
  /** Joint that is placed at (x, y). */
  at: [Joint, number, number];
  /** Pin a hand or foot to (x, y); bend picks the side the elbow/knee goes to. */
  ik?: Partial<Record<Limb, [number, number, number?]>>;
}

export interface Solved {
  hip: V; mid: V; sh: V; shN: V; shF: V; hipN: V; hipF: V;
  eN: V; hN: V; eF: V; hF: V;
  kN: V; aN: V; tN: V; kF: V; aF: V; tF: V;
  head: V;
}

export const L = { spine: 14, upper: 14, fore: 13, thigh: 17, shin: 17, foot: 5, neck: 2.5, head: 5.2 };

const DEF = { an: [80, 75], af: [100, 95], ln: [90, 90], lf: [92, 92] };

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number): V => [Math.cos(rad(d)), Math.sin(rad(d))];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const len = (a: V) => Math.hypot(a[0], a[1]);
const ang = (a: V) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;

/** Two-bone IK: elbow/knee position for root → target. */
function twoBone(root: V, target: V, l1: number, l2: number, bend: number): [V, V] {
  const d = sub(target, root);
  const dist = Math.min(Math.max(len(d), 0.001), l1 + l2 - 0.001);
  const base = ang(d);
  const cos = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  const joint = add(root, dir(base + bend * a), l1);
  const end = add(joint, dir(ang(sub(target, joint))), l2);
  return [joint, end];
}

export function solve(p: Pose): Solved {
  const an = p.an ?? DEF.an;
  const af = p.af ?? DEF.af;
  const ln = p.ln ?? DEF.ln;
  const lf = p.lf ?? DEF.lf;
  const w = p.w ?? 0;
  const hw = p.hw ?? 0;

  const hip: V = [0, 0];
  const mid = add(hip, dir(p.spine[0]), L.spine);
  const sh = add(mid, dir(p.spine[1]), L.spine);
  const up = dir(p.spine[1]);
  const lo = dir(p.spine[0]);
  const perpU: V = [-up[1], up[0]];
  const perpL: V = [-lo[1], lo[0]];
  const shN = add(sh, perpU, w);
  const shF = add(sh, perpU, -w);
  const hipN = add(hip, perpL, hw);
  const hipF = add(hip, perpL, -hw);

  const arm = (root: V, a: number[]): [V, V] => {
    const e = add(root, dir(a[0]), L.upper);
    return [e, add(e, dir(a[1]), L.fore)];
  };
  const leg = (root: V, a: number[]): [V, V] => {
    const k = add(root, dir(a[0]), L.thigh);
    return [k, add(k, dir(a[1]), L.shin)];
  };
  let [eN, hN] = arm(shN, an);
  let [eF, hF] = arm(shF, af);
  let [kN, aN] = leg(hipN, ln);
  let [kF, aF] = leg(hipF, lf);
  const head = add(sh, dir(p.head ?? p.spine[1]), (p.neck ?? L.neck) + L.head);

  const pts: Record<string, V> = { hip, mid, sh, shN, shF, hipN, hipF, eN, hN, eF, hF, kN, aN, kF, aF, head };
  const [j, x, y] = p.at;
  const off = sub([x, y], pts[j]);
  for (const k of Object.keys(pts)) pts[k] = add(pts[k], off);
  ({ eN, hN, eF, hF, kN, aN, kF, aF } = pts as unknown as Solved);

  const ik = p.ik ?? {};
  if (ik.an) [eN, hN] = twoBone(pts.shN, [ik.an[0], ik.an[1]], L.upper, L.fore, ik.an[2] ?? 1);
  if (ik.af) [eF, hF] = twoBone(pts.shF, [ik.af[0], ik.af[1]], L.upper, L.fore, ik.af[2] ?? 1);
  if (ik.ln) [kN, aN] = twoBone(pts.hipN, [ik.ln[0], ik.ln[1]], L.thigh, L.shin, ik.ln[2] ?? 1);
  if (ik.lf) [kF, aF] = twoBone(pts.hipF, [ik.lf[0], ik.lf[1]], L.thigh, L.shin, ik.lf[2] ?? 1);

  const foot = (k: V, a: V, l: number[]) => add(a, dir(l[2] ?? ang(sub(a, k)) - 90), L.foot);
  return {
    hip: pts.hip, mid: pts.mid, sh: pts.sh, shN: pts.shN, shF: pts.shF, hipN: pts.hipN, hipF: pts.hipF,
    eN, hN, eF, hF, kN, aN, kF, aF,
    tN: foot(kN, aN, ln),
    tF: foot(kF, aF, lf),
    head: pts.head,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpArr = (a: number[] | undefined, b: number[] | undefined, d: number[], t: number) => {
  const x = a ?? d;
  const y = b ?? d;
  const n = Math.max(x.length, y.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // A foot angle given on one side only: fall back to point interpolation.
    if (x[i] === undefined || y[i] === undefined) continue;
    out.push(lerp(x[i], y[i], t));
  }
  return out;
};

function sameShape(a: Pose, b: Pose): boolean {
  if (a.at[0] !== b.at[0]) return false;
  const ka = Object.keys(a.ik ?? {}).sort().join();
  const kb = Object.keys(b.ik ?? {}).sort().join();
  if (ka !== kb) return false;
  for (const l of ['ln', 'lf'] as const) {
    if (((a[l]?.length ?? 2) > 2) !== ((b[l]?.length ?? 2) > 2)) return false;
  }
  return (a.head === undefined) === (b.head === undefined);
}

/**
 * Pose between a and b. Same anchor joint and IK set: interpolate angles (so
 * limbs keep their length and pinned hands/feet stay put). Otherwise blend the
 * solved points.
 */
export function between(a: Pose, b: Pose, t: number): Solved {
  if (t <= 0) return solve(a);
  if (t >= 1) return solve(b);
  if (sameShape(a, b)) {
    const ik: Pose['ik'] = {};
    for (const k of Object.keys(a.ik ?? {}) as Limb[]) {
      const x = a.ik![k]!;
      const y = b.ik![k]!;
      ik[k] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t), t < 0.5 ? x[2] : y[2]];
    }
    return solve({
      spine: [lerp(a.spine[0], b.spine[0], t), lerp(a.spine[1], b.spine[1], t)],
      head: a.head !== undefined ? lerp(a.head, b.head!, t) : undefined,
      neck: lerp(a.neck ?? L.neck, b.neck ?? L.neck, t),
      an: lerpArr(a.an, b.an, DEF.an, t),
      af: lerpArr(a.af, b.af, DEF.af, t),
      ln: lerpArr(a.ln, b.ln, DEF.ln, t),
      lf: lerpArr(a.lf, b.lf, DEF.lf, t),
      w: lerp(a.w ?? 0, b.w ?? 0, t),
      hw: lerp(a.hw ?? 0, b.hw ?? 0, t),
      at: [a.at[0], lerp(a.at[1], b.at[1], t), lerp(a.at[2], b.at[2], t)],
      ik,
    });
  }
  const sa = solve(a);
  const sb = solve(b);
  const m = {} as Solved;
  for (const k of Object.keys(sa) as (keyof Solved)[]) {
    m[k] = [lerp(sa[k][0], sb[k][0], t), lerp(sa[k][1], sb[k][1], t)];
  }
  // Blended points shorten limbs; rebuild each chain with the real lengths.
  const seg = (from: V, to: V, l: number): V => {
    const d = sub(to, from);
    const n = len(d) || 1;
    return add(from, d, l / n);
  };
  const out = { ...m };
  out.mid = seg(m.hip, m.mid, L.spine);
  out.sh = seg(out.mid, m.sh, L.spine);
  const shift = sub(out.sh, m.sh);
  for (const k of ['shN', 'shF', 'head'] as const) out[k] = add(m[k], shift);
  out.eN = seg(out.shN, m.eN, L.upper);
  out.hN = seg(out.eN, m.hN, L.fore);
  out.eF = seg(out.shF, m.eF, L.upper);
  out.hF = seg(out.eF, m.hF, L.fore);
  out.kN = seg(m.hipN, m.kN, L.thigh);
  out.aN = seg(out.kN, m.aN, L.shin);
  out.tN = seg(out.aN, m.tN, L.foot);
  out.kF = seg(m.hipF, m.kF, L.thigh);
  out.aF = seg(out.kF, m.aF, L.shin);
  out.tF = seg(out.aF, m.tF, L.foot);
  return out;
}

export interface Frame {
  p: Pose;
  /** ms to hold this pose */
  hold?: number;
  /** ms to move from the previous pose into this one */
  tween?: number;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Total loop length in ms. */
export function cycle(frames: Frame[]): number {
  return frames.reduce((n, f) => n + (f.hold ?? 600) + (f.tween ?? 900), 0);
}

/** Solved figure at time `ms` in the loop (frame 0's tween is the return from the last frame). */
export function at(frames: Frame[], ms: number): Solved {
  if (frames.length === 1) return solve(frames[0].p);
  let t = ms % cycle(frames);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const prev = frames[(i - 1 + frames.length) % frames.length];
    const tw = f.tween ?? 900;
    if (t < tw) return between(prev.p, f.p, ease(t / tw));
    t -= tw;
    const hold = f.hold ?? 600;
    if (t < hold) return solve(f.p);
    t -= hold;
  }
  return solve(frames[0].p);
}
