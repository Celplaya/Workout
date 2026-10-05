<script lang="ts">
  import { addDays, isoDate, parseDate, shortDate, weekStart, WEEKDAYS_SHORT } from '../lib/dates';
  import { store } from '../lib/data.svelte';
  import { kg, volume } from '../lib/format';
  import { trend, volumeOf } from '../lib/stats';
  import type { Session } from '../lib/types';

  let offset = $state(0);

  const monday = $derived(addDays(parseDate(weekStart(new Date())), offset * 7));
  const weekVolume = (start: Date) => {
    const from = isoDate(start);
    const to = isoDate(addDays(start, 6));
    return store.finished
      .filter((s) => s.date >= from && s.date <= to)
      .reduce((n, s) => n + volumeOf(store.setsBySession.get(s.id) ?? []), 0);
  };

  const week = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const date = isoDate(addDays(monday, i));
      return {
        label: WEEKDAYS_SHORT[i],
        date,
        planned: store.dayByWeekday.get(i + 1),
        sessions: store.finished.filter((s) => s.date === date),
        today: date === isoDate(new Date()),
      };
    }),
  );
  const total = $derived(weekVolume(monday));
  const prevTotal = $derived(weekVolume(addDays(monday, -7)));
  const doneCount = $derived(week.filter((d) => d.sessions.length).length);
  const plannedCount = $derived(week.filter((d) => d.planned && d.planned.kind !== 'rest').length);
  const t = $derived(prevTotal ? trend(total, prevTotal) : null);

  const recent = $derived(store.finished.slice(0, 15));

  const exercises = $derived(
    store.exercises
      .map((e) => {
        const sets = store.setsByExercise.get(e.id) ?? [];
        return { e, count: sets.length, best: sets.length ? Math.max(...sets.map((s) => s.weight)) : 0 };
      })
      .filter((x) => x.count > 0 || !x.e.archived)
      .sort((a, b) => a.e.name.localeCompare(b.e.name, 'nl')),
  );

  const sessionVolume = (s: Session) => volumeOf(store.setsBySession.get(s.id) ?? []);
</script>

<div class="page">
  <div class="header"><h1>Voortgang</h1></div>

  <div class="card stack">
    <div class="spread">
      <button class="nav" onclick={() => offset--} aria-label="Vorige week">‹</button>
      <span class="eyebrow">{offset === 0 ? 'Deze week' : `Week van ${shortDate(monday)}`}</span>
      <button class="nav" onclick={() => offset++} disabled={offset >= 0} aria-label="Volgende week">›</button>
    </div>
    <div class="week">
      {#each week as d (d.date)}
        <a
          class="day"
          class:done={d.sessions.length}
          class:today={d.today}
          class:rest={d.planned?.kind === 'rest'}
          href={d.sessions.length ? '#/summary/' + d.sessions[0].id : undefined}
        >
          <span class="small">{d.label}</span>
          <span class="mark">{d.sessions.length ? '✓' : d.planned?.kind === 'rest' ? '–' : ''}</span>
        </a>
      {/each}
    </div>
    <div class="spread">
      <span><b class="num">{doneCount}</b><span class="muted">/{plannedCount} trainingen</span></span>
      <span class="num">
        <b>{volume(total)}</b> <span class="muted">kg</span>
        {#if t}<span class="small {t}">{t === 'up' ? '▲' : t === 'down' ? '▼' : '='}</span>{/if}
      </span>
    </div>
  </div>

  <span class="eyebrow">Recente sessies</span>
  {#if recent.length}
    <div class="list">
      {#each recent as s (s.id)}
        <a class="row" href={'#/summary/' + s.id}>
          <div>
            <div>{s.day_name}</div>
            <div class="small muted">{shortDate(parseDate(s.date))}</div>
          </div>
          <span class="num muted small">
            {#if s.kind === 'cardio'}{s.cardio_done ? '✓ 4×4' : '—'}{s.avg_hr ? ` · ${s.avg_hr} bpm` : ''}{:else}{volume(sessionVolume(s))} kg{/if}
          </span>
        </a>
      {/each}
    </div>
  {:else}
    <p class="empty">Nog geen afgeronde sessies.</p>
  {/if}

  <span class="eyebrow">Oefeningen</span>
  {#if exercises.length}
    <div class="list">
      {#each exercises as x (x.e.id)}
        <a class="row" href={'#/exercise/' + x.e.id}>
          <span>{x.e.name}</span>
          <span class="num muted small">{x.best ? `${kg(x.best)} kg ›` : '›'}</span>
        </a>
      {/each}
    </div>
  {:else}
    <p class="empty">Voeg oefeningen toe in Schema.</p>
  {/if}
</div>

<style>
  .row {
    text-decoration: none;
  }
  .nav {
    width: 44px;
    height: 44px;
    font-size: 24px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .nav:disabled {
    opacity: 0.3;
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 0;
    border-radius: 12px;
    background: var(--surface-2);
    text-decoration: none;
    color: var(--muted);
  }
  .day.today {
    outline: 1px solid var(--muted);
  }
  .day.done {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }
  .day.rest:not(.done) {
    background: transparent;
  }
  .mark {
    height: 20px;
    font-weight: 700;
  }
</style>
