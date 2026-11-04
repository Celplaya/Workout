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
        expect(dist(s.shN, s.eN), `${g.name} upper arm`).toBeCloseTo(L.upper, 0);
        expect(dist(s.hipN, s.kN), `${g.name} thigh`).toBeCloseTo(L.thigh, 0);
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
