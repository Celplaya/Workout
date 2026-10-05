<script lang="ts">
  // Single-series chart: line (e.g. best weight) or bars (e.g. volume).
  // Tap a point/bar to read its value; the latest value is labelled by default.
  let {
    points,
    kind = 'line',
    format = (n: number) => String(n),
  }: { points: { label: string; value: number }[]; kind?: 'line' | 'bar'; format?: (n: number) => string } = $props();

  const W = 320;
  const H = 150;
  const pad = { l: 8, r: 8, t: 26, b: 22 };
  let selected = $state<number | null>(null);

  const max = $derived(Math.max(1, ...points.map((p) => p.value)));
  const min = $derived(kind === 'bar' ? 0 : Math.min(...points.map((p) => p.value)));
  const lo = $derived(kind === 'bar' ? 0 : Math.max(0, min - (max - min || max) * 0.2));
  const step = $derived((W - pad.l - pad.r) / Math.max(1, points.length));
  const x = (i: number) => pad.l + step * i + step / 2;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (max - lo || 1));
  const path = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' '));
  const shown = $derived(selected ?? points.length - 1);
  const barW = $derived(Math.max(4, Math.min(28, step - 4)));
</script>

{#if points.length === 0}
  <p class="empty small">Nog geen data</p>
{:else}
  <svg viewBox="0 0 {W} {H}" role="img">
    <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} class="axis" />
    {#if kind === 'bar'}
      {#each points as p, i}
        {@const top = y(p.value)}
        <path
          class="bar"
          class:dim={selected !== null && selected !== i}
          d="M{x(i) - barW / 2},{H - pad.b} V{top + 4} q0,-4 4,-4 H{x(i) + barW / 2 - 4} q4,0 4,4 V{H - pad.b} Z"
        />
      {/each}
    {:else}
      <path d={path} class="line" />
      {#each points as p, i}
        <circle cx={x(i)} cy={y(p.value)} r={i === shown ? 5 : 3.5} class="dot" />
      {/each}
    {/if}
    {#if points[shown]}
      {@const p = points[shown]}
      <text x={Math.min(W - 40, Math.max(40, x(shown)))} y={Math.max(14, y(p.value) - 10)} class="val" text-anchor="middle">{format(p.value)}</text>
    {/if}
    <text x={pad.l} y={H - 5} class="tick">{points[0].label}</text>
    {#if points.length > 1}
      <text x={W - pad.r} y={H - 5} class="tick" text-anchor="end">{points[points.length - 1].label}</text>
    {/if}
    {#each points as _, i}
      <rect
        x={x(i) - step / 2}
        y="0"
        width={step}
        height={H}
        fill="transparent"
        role="button"
        tabindex="-1"
        onclick={() => (selected = selected === i ? null : i)}
        onkeydown={() => {}}
      />
    {/each}
  </svg>
  {#if selected !== null}
    <p class="small muted sel">Week van {points[selected].label}: <b>{format(points[selected].value)}</b></p>
  {/if}
{/if}

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .axis {
    stroke: var(--line);
    stroke-width: 1;
  }
  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .dot {
    fill: var(--accent);
    stroke: var(--surface);
    stroke-width: 2;
  }
  .bar {
    fill: var(--accent);
  }
  .bar.dim {
    opacity: 0.35;
  }
  .val {
    fill: var(--text);
    font-size: 13px;
    font-weight: 700;
  }
  .tick {
    fill: var(--muted);
    font-size: 11px;
  }
  .sel {
    margin: 4px 0 0;
  }
</style>
