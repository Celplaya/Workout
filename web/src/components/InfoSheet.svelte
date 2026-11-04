<script lang="ts">
  import Figure from './Figure.svelte';
  import { guideFor, VIEW_LABEL } from '../lib/guides';
  import { closeInfo, info } from '../lib/info.svelte';

  const guide = $derived(guideFor(info.name));

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') closeInfo();
  }
</script>

<svelte:window onkeydown={key} />

{#if guide}
  <div class="backdrop" onclick={closeInfo} role="presentation"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={guide.name}>
    <div class="grip"></div>
    <div class="spread">
      <h2>{guide.name}</h2>
      <button class="x" onclick={closeInfo} aria-label="Sluiten">✕</button>
    </div>
    <div class="stage">
      <Figure {guide} />
    </div>
    <span class="eyebrow">{VIEW_LABEL[guide.view ?? 'side']}</span>
    <ol class="cues">
      {#each guide.cues as c, i (i)}<li>{c}</li>{/each}
    </ol>
    {#if guide.tip}<p class="tip"><b>Let op:</b> {guide.tip}</p>{/if}
    <button class="btn" onclick={closeInfo}>Sluiten</button>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.55);
    z-index: 40;
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 560px;
    margin: 0 auto;
    max-height: 92dvh;
    overflow-y: auto;
    z-index: 41;
    background: var(--surface);
    border-radius: 22px 22px 0 0;
    padding: 10px 16px calc(var(--safe-bottom) + 16px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: up 0.22s ease-out;
  }
  @keyframes up {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
  }
  .grip {
    width: 40px;
    height: 5px;
    border-radius: 3px;
    background: var(--line);
    align-self: center;
  }
  .x {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--muted);
    flex: none;
  }
  .stage {
    background: var(--bg);
    border-radius: var(--radius);
    aspect-ratio: 120 / 105;
    max-height: 46dvh;
    padding: 12px;
    display: flex;
    justify-content: center;
  }
  .cues {
    margin: 0;
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    line-height: 1.4;
  }
  .tip {
    margin: 0;
    padding: 12px 14px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-size: 15px;
    line-height: 1.4;
  }
  .tip b {
    color: var(--accent);
  }
</style>
