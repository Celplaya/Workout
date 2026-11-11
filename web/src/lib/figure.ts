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
  /** Arm roots shifted along the spine: > 0 = shoulders shrugged toward the ears. */
  shrug?: number;
  /** Foreshortening (0–1) for a limb or the spine that points toward the viewer. */
  fs?: Partial<Record<Limb | 'sp', number>>;
}

export interface Solved {
  hip: V; mid: V; sh: V; shN: V; shF: V; hipN: V; hipF: V;
  eN: V; hN: V; eF: V; hF: V;
  kN: V; aN: V; tN: V; kF: V; aF: V; tF: V;
  head: V;
}

export const L = { spine: 13, upper: 14, fore: 13, thigh: 18, shin: 18, foot: 5, neck: 2.5, head: 5.2 };

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

  const fs = p.fs ?? {};
  const sp = L.spine * (fs.sp ?? 1);
  const hip: V = [0, 0];
  const mid = add(hip, dir(p.spine[0]), sp);
  const sh = add(mid, dir(p.spine[1]), sp);
  const up = dir(p.spine[1]);
  const lo = dir(p.spine[0]);
  const perpU: V = [-up[1], up[0]];
  const perpL: V = [-lo[1], lo[0]];
  const shN = add(add(sh, perpU, w), up, p.shrug ?? 0);
  const shF = add(add(sh, perpU, -w), up, p.shrug ?? 0);
  const hipN = add(hip, perpL, hw);
  const hipF = add(hip, perpL, -hw);

  const arm = (root: V, a: number[], k = 1): [V, V] => {
    const e = add(root, dir(a[0]), L.upper * k);
    return [e, add(e, dir(a[1]), L.fore * k)];
  };
  const leg = (root: V, a: number[], k = 1): [V, V] => {
    const kn = add(root, dir(a[0]), L.thigh * k);
    return [kn, add(kn, dir(a[1]), L.shin * k)];
  };
  let [eN, hN] = arm(shN, an, fs.an);
  let [eF, hF] = arm(shF, af, fs.af);
  let [kN, aN] = leg(hipN, ln, fs.ln);
  let [kF, aF] = leg(hipF, lf, fs.lf);
  const head = add(sh, dir(p.head ?? p.spine[1]), (p.neck ?? L.neck) + L.head);

  const pts: Record<string, V> = { hip, mid, sh, shN, shF, hipN, hipF, eN, hN, eF, hF, kN, aN, kF, aF, head };
  const [j, x, y] = p.at;
  const off = sub([x, y], pts[j]);
  for (const k of Object.keys(pts)) pts[k] = add(pts[k], off);
  ({ eN, hN, eF, hF, kN, aN, kF, aF } = pts as unknown as Solved);

  const ik = p.ik ?? {};
  const two = (root: V, t: [number, number, number?], l1: number, l2: number, k = 1) =>
    twoBone(root, [t[0], t[1]], l1 * k, l2 * k, t[2] ?? 1);
  if (ik.an) [eN, hN] = two(pts.shN, ik.an, L.upper, L.fore, fs.an);
  if (ik.af) [eF, hF] = two(pts.shF, ik.af, L.upper, L.fore, fs.af);
  if (ik.ln) [kN, aN] = two(pts.hipN, ik.ln, L.thigh, L.shin, fs.ln);
  if (ik.lf) [kF, aF] = two(pts.hipF, ik.lf, L.thigh, L.shin, fs.lf);

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
      shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, t),
      fs: {
        sp: lerp(a.fs?.sp ?? 1, b.fs?.sp ?? 1, t),
        an: lerp(a.fs?.an ?? 1, b.fs?.an ?? 1, t),
        af: lerp(a.fs?.af ?? 1, b.fs?.af ?? 1, t),
        ln: lerp(a.fs?.ln ?? 1, b.fs?.ln ?? 1, t),
        lf: lerp(a.fs?.lf ?? 1, b.fs?.lf ?? 1, t),
      },
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
  // Blended points shorten limbs; rebuild each chain with the real lengths
  // (blended too, for foreshortened limbs).
  const dist = (q: Solved, x: keyof Solved, y: keyof Solved) => len(sub(q[y], q[x]));
  const seg = (from: V, to: V, x: keyof Solved, y: keyof Solved): V => {
    const l = lerp(dist(sa, x, y), dist(sb, x, y), t);
    const d = sub(to, from);
    const n = len(d) || 1;
    return add(from, d, l / n);
  };
  const out = { ...m };
  out.mid = seg(m.hip, m.mid, 'hip', 'mid');
  out.sh = seg(out.mid, m.sh, 'mid', 'sh');
  const shift = sub(out.sh, m.sh);
  for (const k of ['shN', 'shF', 'head'] as const) out[k] = add(m[k], shift);
  out.eN = seg(out.shN, m.eN, 'shN', 'eN');
  out.hN = seg(out.eN, m.hN, 'eN', 'hN');
  out.eF = seg(out.shF, m.eF, 'shF', 'eF');
  out.hF = seg(out.eF, m.hF, 'eF', 'hF');
  out.kN = seg(m.hipN, m.kN, 'hipN', 'kN');
  out.aN = seg(out.kN, m.aN, 'kN', 'aN');
  out.tN = seg(out.aN, m.tN, 'aN', 'tN');
  out.kF = seg(m.hipF, m.kF, 'hipF', 'kF');
  out.aF = seg(out.kF, m.aF, 'kF', 'aF');
  out.tF = seg(out.aF, m.tF, 'aF', 'tF');
  return out;
}

export interface Frame {
  p: Pose;
  /** ms to hold this pose */
  hold?: number;
  /** ms to move from the previous pose into this one */
  tween?: number;
}

// Smooth start and stop, a little quicker through the middle than a plain sine.
const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10) * 0.5 + (0.5 - Math.cos(Math.PI * t) / 2) * 0.5;

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
