<script lang="ts">
  import Chart from '../components/Chart.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { parseDate, shortDate } from '../lib/dates';
  import { patch, store } from '../lib/data.svelte';
  import { kg, volume } from '../lib/format';
  import { byIdx, describeSets, groupBy, prMap, volumeOf, weeklySeries } from '../lib/stats';

  let { id }: { id: string } = $props();

  const ex = $derived(store.exerciseById.get(id));
  const sets = $derived(store.setsByExercise.get(id) ?? []);
  const series = $derived(weeklySeries(sets, store.sessionById).slice(-16));
  const best = $derived(
    sets.length ? sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a)) : null,
  );
  const prs = $derived(prMap(sets));

  const sessions = $derived(
    [...groupBy(sets, (s) => s.session)]
      .map(([sid, ss]) => ({ s: store.sessionById.get(sid), sets: ss.sort(byIdx) }))
      .filter((x) => x.s)
      .sort((a, b) => b.s!.started - a.s!.started),
  );

  let increment = $state(0);
  $effect(() => {
    increment = ex?.increment || store.prefs.increment;
  });

  async function saveIncrement() {
    if (ex && increment > 0 && increment !== ex.increment) await patch('exercises', ex.id, { increment });
  }

  async function rename(e: Event) {
    const name = (e.currentTarget as HTMLInputElement).value.trim();
    if (ex && name && name !== ex.name) await patch('exercises', ex.id, { name });
  }

  const label = (w: string) => shortDate(parseDate(w));
</script>

{#if ex}
  <div class="page">
    <div class="header"><button class="back" onclick={() => history.back()}>‹ Terug</button></div>
    <input class="field title" value={ex.name} onchange={rename} aria-label="Naam" />

    {#if best}
      <div class="card spread">
        <div>
          <span class="eyebrow">Beste set</span>
          <div class="big num">{kg(best.weight)} kg × {best.reps}</div>
        </div>
        <span class="chip accent">★ {prs.size} PR's</span>
      </div>
    {/if}

    <div class="card stack">
      <span class="eyebrow">Zwaarste gewicht per week (kg)</span>
      <Chart points={series.map((p) => ({ label: label(p.week), value: p.best }))} format={(n) => `${kg(n)} kg`} />
    </div>

    <div class="card stack">
      <span class="eyebrow">Volume per week (kg × reps)</span>
      <Chart kind="bar" points={series.map((p) => ({ label: label(p.week), value: p.volume }))} format={(n) => `${volume(n)} kg`} />
    </div>

    <div class="card stack">
      <span class="eyebrow">Stapgrootte gewicht</span>
      <div onfocusout={saveIncrement} onclick={() => setTimeout(saveIncrement)} role="presentation">
        <Stepper bind:value={increment} step={0.25} min={0.25} unit="kg" />
      </div>
    </div>

    <span class="eyebrow">Geschiedenis</span>
    {#if sessions.length}
      <div class="list">
        {#each sessions as x (x.s!.id)}
          <a class="row" href={'#/summary/' + x.s!.id}>
            <div>
              <div class="num">{describeSets(x.sets)}{#if x.sets.some((s) => prs.has(s.id))} <span class="up">★</span>{/if}</div>
              <div class="small muted">{shortDate(parseDate(x.s!.date))} · {x.s!.day_name}</div>
            </div>
            <span class="num muted small">{volume(volumeOf(x.sets))} kg</span>
          </a>
        {/each}
      </div>
    {:else}
      <p class="empty">Nog niet gelogd.</p>
    {/if}

    <button class="btn ghost small" onclick={() => patch('exercises', ex.id, { archived: !ex.archived })}>
      {ex.archived ? 'Uit archief halen' : 'Archiveren'}
    </button>
  </div>
{/if}

<style>
  .title {
    font-size: 28px;
    font-weight: 700;
    padding: 10px 14px;
  }
  .big {
    font-size: 26px;
    font-weight: 700;
  }
  .row {
    text-decoration: none;
  }
</style>
