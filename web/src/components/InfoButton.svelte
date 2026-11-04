<script lang="ts">
  import { guideFor } from '../lib/guides';
  import { openInfo } from '../lib/info.svelte';

  let { name }: { name: string | undefined } = $props();
  const has = $derived(!!guideFor(name));
</script>

{#if has}
  <button
    class="info"
    aria-label={`Uitleg: ${name}`}
    onclick={(e) => {
      e.stopPropagation();
      openInfo(name!);
    }}>i</button
  >
{/if}

<style>
  .info {
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1.5px solid var(--muted);
    color: var(--muted);
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-weight: 700;
    font-size: 16px;
    line-height: 1;
    display: grid;
    place-items: center;
    /* larger tap target than the visible circle */
    position: relative;
  }
  .info::after {
    content: '';
    position: absolute;
    inset: -8px;
  }
  .info:active {
    background: var(--surface-2);
  }
</style>
