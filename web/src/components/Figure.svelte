<script lang="ts">
  import { at, solve, type Solved, type V } from '../lib/figure';
  import type { Guide } from '../lib/guides';

  let { guide, frame }: { guide: Guide; frame?: number } = $props();

  const reduced =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = $derived(frame !== undefined || reduced || guide.frames.length === 1);

  let now = $state(0);
  $effect(() => {
    if (still) return;
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
    still ? solve(guide.frames[Math.min(frame ?? guide.key ?? 0, guide.frames.length - 1)].p) : at(guide.frames, now),
  );

  const vb = $derived(guide.vb ?? [0, 0, 120, 105]);
  const floor = $derived(guide.floor === false ? null : (guide.floor ?? 100));
  const pts = (...p: V[]) => p.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ');
  const ext = (a: V, b: V, k: number): [V, V] => {
    const d: V = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(d[0], d[1]) || 1;
    return [
      [a[0] - (d[0] / l) * k, a[1] - (d[1] / l) * k],
      [b[0] + (d[0] / l) * k, b[1] + (d[1] / l) * k],
    ];
  };
</script>

<svg viewBox={vb.join(' ')} role="img" aria-label={guide.name}>
  <!-- props behind the figure -->
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
        <circle cx={p.x} cy={p.y} r="2" class="solid" />
      {/if}
    {/each}
  </g>

  <!-- far side -->
  <g class="far">
    <polyline points={pts(s.shF, s.eF, s.hF)} />
    <polyline points={pts(s.hipF, s.kF, s.aF, s.tF)} />
  </g>

  <!-- body -->
  <g class="near">
    {#if s.shN[0] !== s.shF[0] || s.shN[1] !== s.shF[1]}<line x1={s.shN[0]} y1={s.shN[1]} x2={s.shF[0]} y2={s.shF[1]} />{/if}
    {#if s.hipN[0] !== s.hipF[0] || s.hipN[1] !== s.hipF[1]}<line x1={s.hipN[0]} y1={s.hipN[1]} x2={s.hipF[0]} y2={s.hipF[1]} />{/if}
    <polyline points={pts(s.hip, s.mid, s.sh)} class="torso" />
    <circle cx={s.head[0]} cy={s.head[1]} r="5.2" class="head" />
    <polyline points={pts(s.hipN, s.kN, s.aN, s.tN)} />
    <polyline points={pts(s.shN, s.eN, s.hN)} />
  </g>

  <!-- props in front of the figure -->
  <g class="prop">
    {#each guide.props ?? [] as p, i (i)}
      {#if p.t === 'bar'}
        <circle cx={p.x} cy={p.y} r="3" class="solid" />
      {:else if p.t === 'dumbbells'}
        {#each [s.hN, s.hF] as h, j (j)}<rect x={h[0] - 4} y={h[1] - 1.6} width="8" height="3.2" rx="1" class="iron" />{/each}
      {:else if p.t === 'barbell'}
        {@const [a, b] = ext(s.hF, s.hN, 9)}
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} class="bb" />
      {:else if p.t === 'plate'}
        <circle cx={s.hN[0]} cy={s.hN[1]} r="5" class="plate" />
      {:else if p.t === 'weight'}
        <line x1={s.hip[0]} y1={s.hip[1]} x2={s.hip[0] + 1} y2={s.hip[1] + 8} class="cable" />
        <rect x={s.hip[0] - 3} y={s.hip[1] + 8} width="8" height="6" rx="1" class="iron" />
      {/if}
    {/each}
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .near,
  .far {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .near {
    stroke: var(--text);
    stroke-width: 3.4;
  }
  .far {
    stroke: var(--muted);
    stroke-width: 3.4;
    opacity: 0.75;
  }
  .torso {
    stroke-width: 4.2;
  }
  .head {
    fill: var(--bg);
    stroke-width: 3;
  }
  .prop {
    stroke: var(--muted);
    fill: none;
    stroke-linecap: round;
  }
  .floor {
    stroke-width: 1.4;
    opacity: 0.6;
  }
  .wall {
    stroke-width: 2;
    opacity: 0.7;
  }
  .mat {
    fill: var(--surface-2);
    stroke: none;
    opacity: 0.55;
  }
  .box {
    fill: var(--surface-2);
    stroke-width: 1.2;
  }
  .solid {
    fill: var(--accent);
    stroke: none;
  }
  .cable {
    stroke-width: 0.8;
    opacity: 0.8;
  }
  .iron {
    fill: var(--accent);
    stroke: none;
  }
  .bb {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .plate {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
</style>
