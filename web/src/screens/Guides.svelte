<script lang="ts">
  import Figure from '../components/Figure.svelte';
  import { GUIDES } from '../lib/guides';
  import { openInfo } from '../lib/info.svelte';

  // '#/guides/frames' shows every key pose (used to check the drawings).
  let { mode = '' }: { mode?: string } = $props();
  let q = $state('');
  import { cycle } from '../lib/figure';
  const MIDS = [0.08, 0.2, 0.32, 0.45, 0.58, 0.7, 0.82, 0.94];
  const list = $derived(GUIDES.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase())));

</script>

<div class="page">
  <div class="header"><h1>Uitleg</h1></div>
  {#if mode !== 'frames' && mode !== 'mids'}
    <input class="field" placeholder="Zoek oefening…" bind:value={q} />
  {/if}
  <div class="grid" class:frames={mode === 'frames' || mode === 'mids'}>
    {#each list as g (g.name)}
      {#if mode === 'mids'}
        <div class="card fr">
          <span class="small">{g.name}</span>
          <div class="row-f mids">
            {#each MIDS as m (m)}<div class="cell"><Figure guide={{ ...g, mark: undefined, arrow: undefined }} time={m * cycle(g.frames)} /></div>{/each}
          </div>
        </div>
      {:else if mode === 'frames'}
        <div class="card fr">
          <span class="small">{g.name}</span>
          <div class="row-f">
            {#each g.frames as _, i (i)}<div class="cell"><Figure guide={g} frame={i} /></div>{/each}
          </div>
        </div>
      {:else}
        <button class="card tile" onclick={() => openInfo(g.name)}>
          <div class="cell"><Figure guide={g} frame={g.key ?? 0} /></div>
          <span class="small">{g.name}</span>
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .grid.frames {
    grid-template-columns: 1fr;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    text-align: left;
  }
  .cell {
    aspect-ratio: 120 / 105;
    background: var(--bg);
    border-radius: 10px;
    padding: 4px;
  }
  .fr {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
  }
  .row-f {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .row-f.mids {
    grid-template-columns: repeat(8, 1fr);
  }
</style>
