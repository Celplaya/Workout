import { describe, expect, it } from 'vitest';
import { at, cycle, L, solve } from './figure';
import { GUIDES, guideFor } from './guides';
import { EXERCISES } from './program';

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('guides', () => {
  it('has a guide for every program exercise', () => {
    const missing = EXERCISES.map((e) => e.name).filter((n) => !guideFor(n));
    expect(missing).toEqual([]);
  });

  it('has no duplicate names and at least 3 cues each', () => {
    expect(new Set(GUIDES.map((g) => g.name.toLowerCase())).size).toBe(GUIDES.length);
    for (const g of GUIDES) expect(g.cues.length, g.name).toBeGreaterThanOrEqual(3);
  });

  it('solves every frame and in-between pose to finite points with intact limbs', () => {
    for (const g of GUIDES) {
      const total = cycle(g.frames);
      const samples = g.frames.map((fr) => solve(fr.p));
      for (let t = 0; t < total; t += 97) samples.push(at(g.frames, t));
      for (const s of samples) {
        for (const [k, v] of Object.entries(s)) {
          expect(Number.isFinite(v[0]) && Number.isFinite(v[1]), `${g.name} ${k}`).toBe(true);
        }
        // Limbs keep their length (shorter only where a pose foreshortens them).
        const short = g.frames.some((fr) => fr.p.fs);
        for (const [x, y, l, what] of [
          [s.shN, s.eN, L.upper, 'upper arm'],
          [s.eF, s.hF, L.fore, 'forearm'],
          [s.hipN, s.kN, L.thigh, 'thigh'],
          [s.kF, s.aF, L.shin, 'shin'],
        ] as const) {
          const d = dist(x, y);
          expect(d, `${g.name} ${what}`).toBeLessThan(l + 0.5);
          expect(d, `${g.name} ${what}`).toBeGreaterThan(short ? l * 0.5 : l - 0.5);
        }
      }
    }
  });
});

describe('figure IK', () => {
  it('pins a hand to its target when reachable', () => {
    const s = solve({ spine: [-90, -90], at: ['sh', 60, 30], ik: { an: [60, 10, 1] } });
    expect(dist(s.hN, [60, 10])).toBeLessThan(0.01);
    expect(dist(s.shN, s.eN)).toBeCloseTo(L.upper, 5);
    expect(dist(s.eN, s.hN)).toBeCloseTo(L.fore, 5);
  });
});

describe('figure extras', () => {
  it('shrug moves the arm roots along the spine, not the head', () => {
    const a = solve({ spine: [-90, -90], at: ['sh', 60, 40] });
    const b = solve({ spine: [-90, -90], at: ['sh', 60, 40], shrug: 3 });
    expect(b.shN[1]).toBeCloseTo(a.shN[1] - 3, 5);
    expect(b.head).toEqual(a.head);
  });
  it('foreshortens a limb', () => {
    const s = solve({ spine: [-90, -90], at: ['hip', 60, 60], ln: [90, 90], fs: { ln: 0.5 } });
    expect(dist(s.hipN, s.kN)).toBeCloseTo(L.thigh / 2, 5);
    expect(dist(s.hipF, s.kF)).toBeCloseTo(L.thigh, 5);
  });
});
