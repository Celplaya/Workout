<script lang="ts">
  import Proposals from '../components/Proposals.svelte';
  import { parseDate, longDate } from '../lib/dates';
  import { deleteSession, store } from '../lib/data.svelte';
  import { amount, clock as fmtClock, duration, kg, volume } from '../lib/format';
  import { go } from '../lib/router.svelte';
  import { byIdx, lastPerformance, prMap, trend, volumeOf, workOf, type Trend } from '../lib/stats';

  let { id }: { id: string } = $props();

  const s = $derived(store.sessionById.get(id));
  const sets = $derived(store.setsBySession.get(id) ?? []);
  const total = $derived(volumeOf(sets));

  const exercises = $derived.by(() => {
    if (!s) return [];
    const order = [...new Set([...sets].sort((a, b) => a.at - b.at).map((x) => x.exercise))];
    return order.map((exId) => {
      const mine = sets.filter((x) => x.exercise === exId).sort(byIdx);
      const all = store.setsByExercise.get(exId) ?? [];
      const prev = lastPerformance(all, store.sessionById, s);
      const vol = volumeOf(mine);
      const prs = prMap(all);
      const measure = store.exerciseById.get(exId)?.measure || 'reps';
      return {
        id: exId,
        name: store.exerciseById.get(exId)?.name ?? '—',
        measure,
        timed: measure !== 'reps',
        sets: mine.map((x) => ({ ...x, pr: prs.get(x.id) })),
        vol,
        trend: prev ? trend(workOf(mine), workOf(prev.sets)) : null,
      };
    });
  });

  // Previous session of the same schedule day, for the headline comparison.
  const prevSession = $derived(
    s ? store.finished.find((x) => x.id !== s.id && x.day === s.day && x.started < s.started) : undefined,
  );
  const prevTotal = $derived(prevSession ? volumeOf(store.setsBySession.get(prevSession.id) ?? []) : null);
  const totalTrend = $derived(prevTotal !== null && s?.kind === 'strength' ? trend(total, prevTotal) : null);
  // Bodyweight work: total reps and hold time instead of kg volume.
  const repTotal = $derived(
    exercises.filter((e) => !e.timed).reduce((n, e) => n + e.sets.reduce((m, x) => m + x.reps, 0), 0),
  );
  const holdTotal = $derived(
    exercises
      .filter((e) => e.measure === 'seconds')
      .reduce((n, e) => n + e.sets.reduce((m, x) => m + x.reps, 0), 0),
  );
  const prCount = $derived(exercises.reduce((n, e) => n + e.sets.filter((x) => x.pr).length, 0));

  const arrow: Record<Trend, string> = { up: '▲', same: '=', down: '▼' };

  async function del() {
    if (!s || !confirm('Deze sessie definitief verwijderen?')) return;
    const sid = s.id;
    go('history', true);
    await deleteSession(sid);
  }
</script>

{#if !s}
  <div class="page"><p class="empty">Sessie niet gevonden.</p></div>
{:else}
  <div class="page">
    <div class="header"><button class="back" onclick={() => history.back()}>‹ Terug</button></div>
    <span class="eyebrow">{longDate(parseDate(s.date))}</span>
    <h1>{s.day_name}</h1>

    <div class="stats">
      <div class="stat">
        <span class="eyebrow">Duur</span>
        <span class="big num">{s.finished ? duration(s.finished - s.started) : '—'}</span>
      </div>
      {#if s.kind === 'cardio'}
        <div class="stat">
          <span class="eyebrow">4×4</span>
          <span class="big" class:up={s.cardio_done}>{s.cardio_done ? 'Gedaan' : 'Niet gedaan'}</span>
        </div>
        {#if s.avg_hr}
          <div class="stat">
            <span class="eyebrow">Gem. hartslag</span>
            <span class="big num">{s.avg_hr} <span class="muted small">bpm</span></span>
          </div>
        {/if}
      {:else}
        {#if total > 0}
          <div class="stat">
            <span class="eyebrow">Volume</span>
            <span class="big num">{volume(total)} <span class="muted small">kg</span></span>
            {#if totalTrend && prevTotal !== null}
              <span class="small {totalTrend}">{arrow[totalTrend]} {totalTrend === 'same' ? 'gelijk' : `${volume(Math.abs(total - prevTotal))} kg`} t.o.v. vorige keer</span>
            {/if}
          </div>
        {/if}
        {#if repTotal}
          <div class="stat">
            <span class="eyebrow">Reps</span>
            <span class="big num">{repTotal}</span>
          </div>
        {/if}
        {#if holdTotal}
          <div class="stat">
            <span class="eyebrow">Hold-tijd</span>
            <span class="big num">{fmtClock(holdTotal)}</span>
          </div>
        {/if}
        <div class="stat">
          <span class="eyebrow">Sets</span>
          <span class="big num">{sets.length}</span>
        </div>
        {#if prCount}
          <div class="stat">
            <span class="eyebrow">PR's</span>
            <span class="big num up">★ {prCount}</span>
          </div>
        {/if}
      {/if}
    </div>

    {#if s.note}<div class="card">{s.note}</div>{/if}

    <Proposals />

    {#each exercises as e (e.id)}
      <div class="card stack">
        <div class="spread">
          <h3>{e.name}</h3>
          {#if e.trend}<span class="small {e.trend}">{arrow[e.trend]}</span>{/if}
        </div>
        <div class="sets">
          {#each e.sets as x, i (x.id)}
            <span class="set num" class:pr={x.pr}>
              <span class="muted">{i + 1}</span>
              {#if e.timed}
                {amount(x.reps, e.measure)}
              {:else}
                {kg(x.weight)}<span class="muted">×</span>{x.reps}
              {/if}
              {#if x.pr}<span class="up">★</span>{/if}
            </span>
          {/each}
        </div>
        {#if e.vol > 0}<span class="small muted num">Volume {volume(e.vol)} kg</span>{/if}
      </div>
    {/each}

    <button class="btn primary big" onclick={() => go('', true)}>Klaar</button>
    <button class="btn ghost danger small" onclick={del}>Sessie verwijderen</button>
  </div>
{/if}

<style>
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .stat {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .big {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .sets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .set {
    display: inline-flex;
    gap: 6px;
    align-items: baseline;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--surface-2);
    font-weight: 600;
  }
</style>
