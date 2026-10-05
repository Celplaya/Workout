<script lang="ts">
  import SyncDot from '../components/SyncDot.svelte';
  import { addDays, isoDate, longDate, weekdayName, weekdayOf } from '../lib/dates';
  import { planFor, startSession, store } from '../lib/data.svelte';
  import { go } from '../lib/router.svelte';
  import { describeSets, lastPerformance } from '../lib/stats';
  import { clock } from '../lib/timers.svelte';
  import type { Day } from '../lib/types';

  // Re-evaluate once per minute so the screen flips at midnight.
  const minute = $derived(Math.floor(clock.now / 60000));
  const now = $derived(new Date(minute * 60000));
  const date = $derived(isoDate(now));
  const day = $derived(store.dayByWeekday.get(weekdayOf(now)));
  const doneToday = $derived(store.finished.filter((s) => s.date === date));

  const next = $derived.by(() => {
    for (let i = 1; i <= 7; i++) {
      const d = addDays(now, i);
      const dd = store.dayByWeekday.get(weekdayOf(d));
      if (dd && dd.kind !== 'rest') return { day: dd, inDays: i, date: d };
    }
    return null;
  });

  let picking = $state(false);
  let starting = false;

  async function start(d: Day) {
    if (store.active) return go('session');
    if (starting) return;
    starting = true;
    await startSession(d, date);
    go('session');
  }

  function prevText(exId: string) {
    const p = lastPerformance(store.setsByExercise.get(exId) ?? [], store.sessionById);
    return p ? describeSets(p.sets) : '';
  }

  const when = (n: number) => (n === 1 ? 'Morgen' : weekdayName(weekdayOf(addDays(now, n))));
</script>

<div class="page">
  <div class="header">
    <span class="eyebrow">{longDate(now)}</span>
    <SyncDot />
  </div>

  {#if store.active}
    <button class="card resume" onclick={() => go('session')}>
      <span class="eyebrow" style="color:inherit">Sessie bezig</span>
      <h2>{store.active.day_name}</h2>
      <span>Ga verder →</span>
    </button>
  {/if}

  {#if !day}
    <p class="empty">Schema laden…</p>
  {:else if day.kind === 'rest'}
    <h1>Rustdag</h1>
    <p class="muted">Herstel is ook training.</p>
    {#if next}
      <div class="card stack">
        <span class="eyebrow">{when(next.inDays)}</span>
        <h2>{next.day.name}</h2>
        {#each planFor(next.day.id) as p (p.id)}
          <div class="spread small"><span>{store.exerciseById.get(p.exercise)?.name}</span><span class="muted num">{p.target_sets}×{p.target_reps}</span></div>
        {/each}
      </div>
    {/if}
  {:else}
    <h1>{day.name}</h1>
    {#if doneToday.length}
      <a class="chip accent" href={'#/summary/' + doneToday[0].id}>✓ Vandaag gedaan · bekijk overzicht</a>
    {/if}

    {#if day.kind === 'cardio'}
      <div class="card stack">
        <span class="eyebrow">Norwegian 4×4</span>
        <p style="margin:0">4 × 4 min op RPE 8–9<br /><span class="muted">3 min actief herstel ertussen</span></p>
      </div>
    {:else}
      {@const plan = planFor(day.id)}
      {#if plan.length === 0}
        <div class="card empty">
          Nog geen oefeningen voor {day.name}.<br /><a href={'#/day/' + day.id}>Voeg ze toe in Schema →</a>
        </div>
      {:else}
        <div class="list">
          {#each plan as p (p.id)}
            {@const prev = prevText(p.exercise)}
            <div class="row">
              <div>
                <div>{store.exerciseById.get(p.exercise)?.name ?? '—'}</div>
                {#if prev}<div class="small muted">vorige: {prev}</div>{/if}
              </div>
              <span class="num muted">{p.target_sets}×{p.target_reps}</span>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    {#if !store.active}
      <button class="btn primary big" onclick={() => start(day)}>Start {day.name}</button>
    {/if}
  {/if}

  {#if !store.active}
    {#if picking}
      <div class="list">
        {#each [...store.days].sort((a, b) => a.weekday - b.weekday) as d (d.id)}
          {#if d.kind !== 'rest'}
            <button class="row" onclick={() => start(d)}>
              <span>{d.name}</span><span class="muted small">{weekdayName(d.weekday)}</span>
            </button>
          {/if}
        {/each}
      </div>
    {:else}
      <button class="btn ghost" onclick={() => (picking = true)}>Andere training doen</button>
    {/if}
  {/if}
</div>

<style>
  .resume {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    background: var(--accent);
    color: var(--accent-ink);
  }
  .chip {
    align-self: flex-start;
    text-decoration: none;
  }
  .card a {
    color: var(--accent);
  }
</style>
