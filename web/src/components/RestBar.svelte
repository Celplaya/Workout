<script lang="ts">
  import { clock as fmt } from '../lib/format';
  import { addRest, rest, restRemaining, stopRest } from '../lib/timers.svelte';

  let { withTabs = true }: { withTabs?: boolean } = $props();
  const remaining = $derived(restRemaining());
  const done = $derived(rest.end > 0 && remaining <= 0);
  const pct = $derived(rest.total ? Math.min(100, 100 - (remaining / rest.total) * 100) : 0);
</script>

{#if rest.end}
  <div class="bar" class:done class:withTabs>
    <div class="progress" style="width:{pct}%"></div>
    {#if done}
      <button class="label" onclick={stopRest}>
        <span>Rust voorbij — volgende set</span>
        <span class="x">✕</span>
      </button>
    {:else}
      <div class="label">
        <span class="muted small">Rust</span>
        <span class="time num">{fmt(remaining)}</span>
      </div>
      <button class="act" onclick={() => addRest(30)}>+30s</button>
      <button class="act" onclick={stopRest}>Skip</button>
    {/if}
  </div>
{/if}

<style>
  .bar {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(var(--safe-bottom) + 12px);
    max-width: 536px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 8px 16px;
    min-height: 64px;
    border-radius: 18px;
    background: var(--surface-2);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.5);
    overflow: hidden;
    z-index: 20;
  }
  .bar.withTabs {
    bottom: calc(var(--safe-bottom) + var(--tab-h) + 8px);
  }
  .progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    background: var(--accent);
    transition: width 0.25s linear;
  }
  .label {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .time {
    font-size: 30px;
    font-weight: 700;
  }
  .act {
    height: 48px;
    padding: 0 16px;
    border-radius: 12px;
    background: var(--line);
    font-weight: 600;
  }
  .done {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .done .label {
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    min-height: 48px;
    padding-right: 8px;
  }
</style>
