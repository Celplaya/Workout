<script lang="ts">
  // Small quiet chart: a line (gaps where a value is 0) or bars, with an
  // optional band (e.g. the personal HRV range) and an optional target line.
  let {
    values,
    kind = 'line',
    band,
    target,
    height = 44,
    highlightLast = true,
  }: {
    values: number[];
    kind?: 'line' | 'bars';
    band?: [number, number];
    target?: number;
    height?: number;
    highlightLast?: boolean;
  } = $props();

  const W = 200;
  const real = $derived(values.filter((v) => v > 0));
  const lo = $derived(kind === 'bars' ? 0 : Math.min(...real, ...(band ? [band[0]] : [])));
  const hi = $derived(Math.max(...real, ...(band ? [band[1]] : []), target ?? 0, 1));
  const pad = $derived(kind === 'bars' ? 0 : Math.max(1, (hi - lo) * 0.15));
  const y = (v: number) => height - 3 - ((v - (lo - pad)) / (hi + pad - (lo - pad) || 1)) * (height - 6);
  const x = (i: number) =>
    kind === 'bars' ? ((i + 0.5) / values.length) * W : values.length > 1 ? (i / (values.length - 1)) * (W - 6) + 3 : W / 2;

  // Line segments, broken at missing values.
  const segments = $derived.by(() => {
    const out: string[] = [];
    let cur: string[] = [];
    values.forEach((v, i) => {
      if (v > 0) cur.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      else if (cur.length) {
        out.push(cur.join(' '));
        cur = [];
      }
    });
    if (cur.length) out.push(cur.join(' '));
    return out;
  });
  const lastIdx = $derived(values.reduce((n, v, i) => (v > 0 ? i : n), -1));
  const bw = $derived(Math.max(2, (W / values.length) * 0.62));
</script>

<svg viewBox="0 0 {W} {height}" preserveAspectRatio="none" style:height="{height}px" aria-hidden="true">
  {#if band && real.length}
    <rect x="0" y={y(band[1])} width={W} height={Math.max(1, y(band[0]) - y(band[1]))} class="band" />
  {/if}
  {#if target}
    <line x1="0" x2={W} y1={y(target)} y2={y(target)} class="target" />
  {/if}
  {#if kind === 'bars'}
    {#each values as v, i (i)}
      {#if v > 0}
        <rect
          x={x(i) - bw / 2}
          y={y(v)}
          width={bw}
          height={Math.max(1, height - 3 - y(v))}
          rx="1.5"
          class="bar"
          class:last={highlightLast && i === values.length - 1}
        />
      {:else}
        <rect x={x(i) - bw / 2} y={height - 4} width={bw} height="1" class="none" />
      {/if}
    {/each}
  {:else}
    {#each segments as pts (pts)}
      {#if pts.includes(' ')}<polyline points={pts} class="line" vector-effect="non-scaling-stroke" />{/if}
    {/each}
  {/if}
</svg>
{#if kind === 'line' && highlightLast && lastIdx >= 0}
  <span class="dot" style:left="{(x(lastIdx) / W) * 100}%" style:top="{y(values[lastIdx])}px"></span>
{/if}

<style>
  :global(.spark) {
    position: relative;
  }
  svg {
    display: block;
    width: 100%;
    overflow: visible;
  }
  .band {
    fill: var(--text);
    opacity: 0.06;
  }
  .target {
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    vector-effect: non-scaling-stroke;
    opacity: 0.7;
  }
  .line {
    fill: none;
    stroke: var(--text);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.85;
  }
  .bar {
    fill: var(--text);
    opacity: 0.28;
  }
  .bar.last {
    fill: var(--accent);
    opacity: 1;
  }
  .none {
    fill: var(--muted);
    opacity: 0.35;
  }
  .dot {
    position: absolute;
    width: 7px;
    height: 7px;
    margin: -3.5px 0 0 -3.5px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px var(--bg);
  }
</style>
