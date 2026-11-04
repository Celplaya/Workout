<script lang="ts">
  import Figure from '../components/Figure.svelte';
  import { GUIDES } from '../lib/guides';
  import { openInfo } from '../lib/info.svelte';

  // '#/guides/frames' shows every key pose (used to check the drawings).
  let { mode = '' }: { mode?: string } = $props();
  let q = $state('');
  const list = $derived(GUIDES.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase())));
</script>

<div class="page">
  <div class="header"><h1>Uitleg</h1></div>
  {#if mode !== 'frames'}
    <input class="field" placeholder="Zoek oefening…" bind:value={q} />
  {/if}
  <div class="grid" class:frames={mode === 'frames'}>
    {#each list as g (g.name)}
      {#if mode === 'frames'}
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
</style>
