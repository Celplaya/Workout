<script lang="ts">
  import { WEEKDAYS_SHORT } from '../lib/dates';
  import { planFor, store } from '../lib/data.svelte';

  const days = $derived([...store.days].sort((a, b) => a.weekday - b.weekday));
  const kindLabel = { strength: 'Kracht', cardio: 'Cardio', rest: 'Rust' };
</script>

<div class="page">
  <div class="header"><h1>Schema</h1></div>
  <div class="list">
    {#each days as d (d.id)}
      {@const n = planFor(d.id).length}
      <a class="row" href={'#/day/' + d.id}>
        <span class="wd muted">{WEEKDAYS_SHORT[d.weekday - 1]}</span>
        <span class="name">{d.name}</span>
        <span class="muted small">{d.kind === 'strength' ? `${n} oef.` : kindLabel[d.kind]} ›</span>
      </a>
    {/each}
  </div>
</div>

<style>
  .row {
    text-decoration: none;
  }
  .wd {
    width: 28px;
    font-weight: 600;
  }
  .name {
    flex: 1;
    font-weight: 600;
  }
</style>
