<script lang="ts">
  import { at, solve, type Solved, type V } from '../lib/figure';
  import type { Guide } from '../lib/guides';

  // "Mannequin" style: solid limbs with an outline so overlapping parts stay
  // readable, a nose for the facing direction, hands and feet, a faint ghost of
  // the start pose, a movement arrow and one highlighted body part.
  let { guide, frame, time }: { guide: Guide; frame?: number; time?: number } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const reduced =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = $derived(time === undefined && (frame !== undefined || reduced || guide.frames.length === 1));

  let now = $state(0);
  $effect(() => {
    if (still || time !== undefined) return;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      now = t - start;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  const s: Solved = $derived(
    time !== undefined
      ? at(guide.frames, time)
      : still
        ? solve(guide.frames[Math.min(frame ?? guide.key ?? 0, guide.frames.length - 1)].p)
        : at(guide.frames, now),
  );
  // Faint start pose, only where an arrow explains the movement.
  const ghost: Solved | null = $derived(guide.arrow ? solve(guide.frames[guide.arrow.from].p) : null);

  const vb = $derived(guide.vb ?? [0, 0, 120, 105]);
  const floor = $derived(guide.floor === false ? null : (guide.floor ?? 100));
  const P = (...p: V[]) => p.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ');

  // Face direction: perpendicular to the upper spine, toward the chest.
  const nose = $derived.by(() => {
    const d: V = [s.sh[0] - s.mid[0], s.sh[1] - s.mid[1]];
    const l = Math.hypot(d[0], d[1]) || 1;
    const k = guide.face ?? 1;
    const f: V = [(-d[1] / l) * k, (d[0] / l) * k];
    const r = 5.6;
    return { a: [s.head[0] + f[0] * r * 0.55, s.head[1] + f[1] * r * 0.55] as V, b: [s.head[0] + f[0] * (r + 2.2), s.head[1] + f[1] * (r + 2.2)] as V };
  });

  const arrowPath = $derived.by(() => {
    const a = guide.arrow;
    if (!a) return '';
    const p0 = solve(guide.frames[a.from].p)[a.joint];
    const p1 = solve(guide.frames[a.to].p)[a.joint];
    const m: V = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const d: V = [p1[0] - p0[0], p1[1] - p0[1]];
    const l = Math.hypot(d[0], d[1]) || 1;
    const b = a.bend ?? 8;
    const c: V = [m[0] - (d[1] / l) * b, m[1] + (d[0] / l) * b];
    // shorten both ends a little so the arrow doesn't sit on the joint
    const sh = (p: V, q: V, k: number): V => {
      const v: V = [q[0] - p[0], q[1] - p[1]];
      const n = Math.hypot(v[0], v[1]) || 1;
      return [p[0] + (v[0] / n) * k, p[1] + (v[1] / n) * k];
    };
    const s0 = sh(p0, c, 4);
    const s1 = sh(p1, c, 5);
    return `M${s0[0].toFixed(1)},${s0[1].toFixed(1)} Q${c[0].toFixed(1)},${c[1].toFixed(1)} ${s1[0].toFixed(1)},${s1[1].toFixed(1)}`;
  });

  const mark = $derived(guide.mark ? { p: s[guide.mark.joint], ...guide.mark } : null);
</script>

<svg viewBox={vb.join(' ')} role="img" aria-label={guide.name}>
  <defs>
    <marker id={'ah' + uid} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="ahead" />
    </marker>
  </defs>

  <!-- props behind -->
  <g class="prop">
    {#if floor !== null}<line x1={vb[0] + 4} y1={floor} x2={vb[0] + vb[2] - 4} y2={floor} class="floor" />{/if}
    {#each guide.props ?? [] as p, i (i)}
      {#if p.t === 'mat'}
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="4" class="mat" />
      {:else if p.t === 'wall'}
        <line x1={p.x} y1={p.from ?? vb[1]} x2={p.x} y2={p.to ?? floor ?? vb[1] + vb[3]} class="wall" />
      {:else if p.t === 'box'}
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1.5" class="box" />
      {:else if p.t === 'line'}
        <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} class="wall" style:stroke-width={p.w ?? 2} />
      {:else if p.t === 'cable'}
        <line x1={s.hN[0]} y1={s.hN[1]} x2={p.x} y2={p.y} class="cable" />
      {/if}
    {/each}
  </g>

  <!-- ghost of the start pose -->
  {#if ghost}
    <g class="ghost">
      <polyline points={P(ghost.shF, ghost.eF, ghost.hF)} />
      <polyline points={P(ghost.hipF, ghost.kF, ghost.aF, ghost.tF)} />
      <polyline points={P(ghost.hip, ghost.mid, ghost.sh)} class="t" />
      <circle cx={ghost.head[0]} cy={ghost.head[1]} r="5.6" />
      <polyline points={P(ghost.hipN, ghost.kN, ghost.aN, ghost.tN)} />
      <polyline points={P(ghost.shN, ghost.eN, ghost.hN)} />
    </g>
  {/if}

  <!-- far limbs -->
  <g class="far">
    {#each [P(s.shF, s.eF, s.hF), P(s.hipF, s.kF, s.aF), P(s.aF, s.tF)] as pts, i (i)}
      <polyline points={pts} class="ol" class:foot={i === 2} /><polyline points={pts} class="fill" class:foot={i === 2} />
    {/each}
    <circle cx={s.hF[0]} cy={s.hF[1]} r="2.6" class="hand" />
  </g>

  <!-- torso + head -->
  <g class="near">
    {#if s.shN[0] !== s.shF[0] || s.shN[1] !== s.shF[1]}
      <line x1={s.shN[0]} y1={s.shN[1]} x2={s.shF[0]} y2={s.shF[1]} class="ol" /><line x1={s.shN[0]} y1={s.shN[1]} x2={s.shF[0]} y2={s.shF[1]} class="fill" />
    {/if}
    {#if s.hipN[0] !== s.hipF[0] || s.hipN[1] !== s.hipF[1]}
      <line x1={s.hipN[0]} y1={s.hipN[1]} x2={s.hipF[0]} y2={s.hipF[1]} class="ol" /><line x1={s.hipN[0]} y1={s.hipN[1]} x2={s.hipF[0]} y2={s.hipF[1]} class="fill" />
    {/if}
    <polyline points={P(s.hip, s.mid, s.sh)} class="ol torso" />
    <polyline points={P(s.hip, s.mid, s.sh)} class="fill torso" />
    {#if (guide.view ?? 'side') === 'side'}<line x1={nose.a[0]} y1={nose.a[1]} x2={nose.b[0]} y2={nose.b[1]} class="nose" />{/if}
    <circle cx={s.head[0]} cy={s.head[1]} r="5.6" class="head" />
  </g>

  <!-- near limbs -->
  <g class="near">
    {#each [P(s.hipN, s.kN, s.aN), P(s.aN, s.tN), P(s.shN, s.eN, s.hN)] as pts, i (i)}
      <polyline points={pts} class="ol" class:foot={i === 1} /><polyline points={pts} class="fill" class:foot={i === 1} />
    {/each}
    <circle cx={s.hN[0]} cy={s.hN[1]} r="2.6" class="hand" />
  </g>

  <!-- props in front -->
  <g class="prop">
    {#each guide.props ?? [] as p, i (i)}
      {#if p.t === 'bar'}
        <circle cx={p.x} cy={p.y} r="3.2" class="solid" />
      {:else if p.t === 'dumbbells'}
        {#each [s.hN, s.hF] as h, j (j)}<rect x={h[0] - 4} y={h[1] - 1.6} width="8" height="3.2" rx="1" class="iron" />{/each}
      {:else if p.t === 'weight'}
        <rect x={s.hip[0] - 3} y={s.hip[1] + 8} width="8" height="6" rx="1" class="iron" />
      {:else if p.t === 'plate'}
        <circle cx={s.hN[0]} cy={s.hN[1]} r="5.2" class="plate" />
      {:else if p.t === 'barbell'}
        {@const d = [s.hN[0] - s.hF[0], s.hN[1] - s.hF[1]]}
        {@const l = Math.hypot(d[0], d[1]) || 1}
        <line x1={s.hF[0] - (d[0] / l) * 9} y1={s.hF[1] - (d[1] / l) * 9} x2={s.hN[0] + (d[0] / l) * 9} y2={s.hN[1] + (d[1] / l) * 9} class="bb" />
      {/if}
    {/each}
  </g>

  {#if arrowPath}
    <path d={arrowPath} class="arrow" marker-end={`url(#ah${uid})`} />
  {/if}

  {#if mark}
    {@const w = mark.label.length * 2.7}
    {@const anchor = mark.dx < -4 ? 'end' : mark.dx > 4 ? 'start' : 'middle'}
    {@const left = anchor === 'end' ? w : anchor === 'middle' ? w / 2 : 0}
    {@const right = anchor === 'start' ? w : anchor === 'middle' ? w / 2 : 0}
    {@const lx = Math.min(Math.max(mark.p[0] + mark.dx, vb[0] + 2 + left), vb[0] + vb[2] - 2 - right)}
    {@const ly = Math.min(Math.max(mark.p[1] + mark.dy, vb[1] + 7), vb[1] + vb[3] - 2)}
    <circle cx={mark.p[0]} cy={mark.p[1]} r="4.6" class="mark" />
    <line x1={mark.p[0]} y1={mark.p[1]} x2={lx} y2={ly} class="leader" />
    <text x={lx} y={ly - 1.5} class="label" text-anchor={anchor}>{mark.label}</text>
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    --near: var(--text);
    --far: #79808a;
  }
  polyline,
  line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ol {
    stroke: var(--bg);
    stroke-width: 7.8;
  }
  .fill {
    stroke-width: 5;
  }
  .ol.torso {
    stroke-width: 10.4;
  }
  .fill.torso {
    stroke-width: 7.4;
  }
  .ol.foot {
    stroke-width: 7;
  }
  .fill.foot {
    stroke-width: 4.2;
  }
  .near .fill,
  .near .nose {
    stroke: var(--near);
  }
  .far .fill {
    stroke: var(--far);
  }
  .nose {
    stroke-width: 3.4;
  }
  .head {
    fill: var(--near);
    stroke: var(--bg);
    stroke-width: 1.6;
  }
  .hand {
    stroke: var(--bg);
    stroke-width: 1.4;
  }
  .near .hand {
    fill: var(--near);
  }
  .far .hand {
    fill: var(--far);
  }
  .ghost {
    opacity: 0.16;
  }
  .ghost polyline,
  .ghost circle {
    stroke: var(--text);
    stroke-width: 5;
    fill: none;
  }
  .ghost .t {
    stroke-width: 7;
  }
  .ghost circle {
    fill: var(--text);
    stroke: none;
  }
  .prop {
    stroke: var(--muted);
    fill: none;
  }
  .floor {
    stroke-width: 1.4;
    opacity: 0.6;
  }
  .wall {
    stroke-width: 2;
    opacity: 0.7;
  }
  .box {
    fill: var(--surface-2);
    stroke-width: 1.2;
  }
  .mat {
    fill: var(--surface-2);
    stroke: none;
    opacity: 0.55;
  }
  .cable {
    stroke-width: 0.8;
  }
  .solid,
  .iron {
    fill: var(--accent);
    stroke: var(--bg);
    stroke-width: 1.2;
  }
  .plate {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.2;
  }
  .bb {
    stroke: var(--accent);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .arrow {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.8;
    stroke-dasharray: 3 2.4;
    opacity: 0.9;
  }
  .ahead {
    fill: var(--accent);
  }
  .mark {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.6;
  }
  .leader {
    stroke: var(--accent);
    stroke-width: 0.8;
  }
  .label {
    fill: var(--accent);
    font-size: 5px;
    font-weight: 700;
    paint-order: stroke;
    stroke: var(--bg);
    stroke-width: 2.4px;
    stroke-linejoin: round;
  }
</style>
