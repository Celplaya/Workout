<script lang="ts">
  import { body, capsule, type BodyOptions } from '../lib/body';
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

  const sideView = $derived((guide.view ?? 'side') === 'side');
  // Hands hold on to something when any pose pins them (bar, parallettes, bench).
  const grip = $derived(guide.frames.some((fr) => fr.p.ik?.an || fr.p.ik?.af) || !!guide.grip);
  const opts = (p: { w?: number; hw?: number }, breath = 0): BodyOptions => ({
    face: guide.face ?? 1,
    w: p.w ?? 0,
    hw: p.hw ?? 0,
    side: sideView,
    floor,
    grip,
    fingers: guide.fingers,
    breath,
  });
  const pose0 = $derived(guide.frames[0].p);
  const breath = $derived(still ? 0 : Math.sin((time ?? now) / 520));
  const b = $derived(body(s, opts(pose0, breath)));
  const ghostBody = $derived(ghost ? body(ghost, opts(pose0)) : null);

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
    {#if floor !== null}<line x1={vb[0] + 4} y1={floor + 0.7} x2={vb[0] + vb[2] - 4} y2={floor + 0.7} class="floor" />{/if}
    {#each guide.props ?? [] as p, i (i)}
      {#if p.t === 'mat'}
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="4" class="mat" />
      {:else if p.t === 'wall'}
        <rect x={(p.side ?? 1) > 0 ? p.x : p.x - 6} y={p.from ?? vb[1]} width="6" height={(p.to ?? floor ?? vb[1] + vb[3]) - (p.from ?? vb[1])} class="wallfill" />
        <line x1={p.x} y1={p.from ?? vb[1]} x2={p.x} y2={p.to ?? floor ?? vb[1] + vb[3]} class="wall" />
      {:else if p.t === 'box'}
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1.5" class="box" />
        {#if p.h > 12}<line x1={p.x + 2.5} y1={p.y + 3.5} x2={p.x + p.w - 2.5} y2={p.y + 3.5} class="trim" />{/if}
        {#if p.label}<text x={p.x + p.w / 2} y={p.y + p.h / 2 + 3} class="plabel" text-anchor="middle">{p.label}</text>{/if}
      {:else if p.t === 'stepper'}
        {@const fl = floor ?? 100}
        <rect x={p.x + 1} y={p.y + 3} width="7" height={fl - p.y - 3} rx="1" class="box" />
        <rect x={p.x + p.w - 8} y={p.y + 3} width="7" height={fl - p.y - 3} rx="1" class="box" />
        <rect x={p.x} y={p.y} width={p.w} height="3.6" rx="1.6" class="deck" />
        {#if p.label}<text x={p.x + p.w / 2} y={fl + 5} class="plabel" text-anchor="middle">{p.label}</text>{/if}
      {:else if p.t === 'bench'}
        {@const fl = floor ?? 100}
        <line x1={p.x + 5} y1={p.y + 4} x2={p.x + 5} y2={fl} class="leg" />
        <line x1={p.x + p.w - 5} y1={p.y + 4} x2={p.x + p.w - 5} y2={fl} class="leg" />
        <rect x={p.x} y={p.y} width={p.w} height="4.6" rx="2.2" class="deck" />
      {:else if p.t === 'pbar'}
        {@const fl = floor ?? 100}
        <line x1={p.x + 2.5} y1={p.y} x2={p.x + 1} y2={fl} class="leg" />
        <line x1={p.x + p.w - 2.5} y1={p.y} x2={p.x + p.w - 1} y2={fl} class="leg" />
        <line x1={p.x} y1={p.y} x2={p.x + p.w} y2={p.y} class="rail" />
      {:else if p.t === 'line'}
        <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} class="wall" style:stroke-width={p.w ?? 2} />
      {:else if p.t === 'bar' && p.post}
        <line x1={p.x} y1={p.y} x2={p.x} y2={floor ?? 100} class="post" />
      {:else if p.t === 'cable'}
        <line x1={s.hN[0]} y1={s.hN[1]} x2={p.x} y2={p.y} class="cable" />
      {/if}
    {/each}
  </g>

  <!-- ghost of the start pose -->
  {#if ghostBody}
    <g class="ghost">
      {#each [...ghostBody.farArm, ...ghostBody.farLeg, ...ghostBody.core, ...ghostBody.head, ...ghostBody.nearLeg, ...ghostBody.nearArm] as d, i (i)}<path {d} />{/each}
    </g>
  {/if}

  {#snippet group(ds: string[], cls: string)}
    <g class={cls}>
      {#each ds as d, i (i)}<path {d} class="ol" />{/each}
      {#each ds as d, i (i)}<path {d} class="fl" />{/each}
    </g>
  {/snippet}

  {@render group(b.farArm, sideView ? 'far' : 'near')}
  {@render group(b.farLeg, sideView ? 'far' : 'near')}
  {@render group(b.core, 'core')}
  {@render group(b.head, 'near')}
  {#if b.eye}<circle cx={b.eye[0]} cy={b.eye[1]} r="0.8" class="eye" />{/if}
  {@render group(b.nearLeg, 'near')}
  {@render group(b.nearArm, 'near')}

  <!-- props in front -->
  <g class="prop">
    {#each guide.props ?? [] as p, i (i)}
      {#if p.t === 'bar'}
        <circle cx={p.x} cy={p.y} r="3" class="solid" />
      {:else if p.t === 'dumbbells'}
        {#each [s.hN, s.hF] as h, j (j)}<rect x={h[0] - 4.5} y={h[1] - 1.8} width="9" height="3.6" rx="1.2" class="iron" />{/each}
      {:else if p.t === 'weight'}
        <rect x={s.hip[0] - 4} y={s.hip[1] + 7} width="9" height="7" rx="1.4" class="iron" />
      {:else if p.t === 'vest'}
        <path d={capsule(s.mid, [(s.mid[0] + s.sh[0] * 2) / 3, (s.mid[1] + s.sh[1] * 2) / 3], 5.6, 5.9)} class="vest" />
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
    <circle cx={mark.p[0]} cy={mark.p[1]} r="3.8" class="mark" />
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
    --core: color-mix(in srgb, var(--text) 80%, var(--bg));
    --far: color-mix(in srgb, var(--text) 46%, var(--bg));
  }
  line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ol {
    fill: var(--bg);
    stroke: var(--bg);
    stroke-width: 2.6;
    stroke-linejoin: round;
  }
  .fl {
    stroke-width: 0.5;
    stroke-linejoin: round;
  }
  .near .fl {
    fill: var(--near);
    stroke: var(--near);
  }
  .core .fl {
    fill: var(--core);
    stroke: var(--core);
  }
  .far .fl {
    fill: var(--far);
    stroke: var(--far);
  }
  .eye {
    fill: var(--bg);
  }
  .ghost {
    opacity: 0.13;
  }
  .ghost path {
    fill: var(--text);
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
    opacity: 0.75;
  }
  .wallfill {
    fill: var(--surface-2);
    stroke: none;
    opacity: 0.7;
  }
  .box,
  .deck {
    fill: var(--surface-2);
    stroke-width: 1.2;
  }
  .trim {
    stroke-width: 0.7;
    opacity: 0.6;
  }
  .leg {
    stroke-width: 1.8;
  }
  .rail {
    stroke-width: 3;
    stroke: var(--accent);
  }
  .post {
    stroke-width: 2.2;
    opacity: 0.45;
  }
  .plabel {
    fill: var(--muted);
    stroke: none;
    font-size: 4.6px;
    font-weight: 700;
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
  .vest {
    fill: color-mix(in srgb, var(--accent) 80%, var(--bg));
    stroke: var(--bg);
    stroke-width: 1;
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
    stroke-width: 1.5;
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
