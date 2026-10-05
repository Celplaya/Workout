<script lang="ts">
  import { weekdayName } from '../lib/dates';
  import { createExercise, patch, planFor, remove, save, store } from '../lib/data.svelte';
  import { newId } from '../lib/id';
  import { userId } from '../lib/pb';
  import type { DayKind, PlanItem } from '../lib/types';

  let { id }: { id: string } = $props();

  const day = $derived(store.days.find((d) => d.id === id));
  const plan = $derived(planFor(id));
  const library = $derived(
    store.exercises.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name, 'nl')),
  );

  let newName = $state('');

  async function rename(e: Event) {
    const name = (e.currentTarget as HTMLInputElement).value.trim();
    if (day && name && name !== day.name) await patch('days', day.id, { name });
  }

  async function setKind(kind: DayKind) {
    if (day) await patch('days', day.id, { kind });
  }

  async function add(e: Event) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    newName = '';
    let ex = store.exercises.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!ex) ex = await createExercise(name);
    else if (ex.archived) await patch('exercises', ex.id, { archived: false });
    const position = plan.length ? Math.max(...plan.map((p) => p.position)) + 1 : 0;
    await save('plan_items', {
      id: newId(),
      user: userId(),
      day: id,
      exercise: ex.id,
      position,
      target_sets: 3,
      target_reps: 8,
    });
  }

  async function move(i: number, dir: -1 | 1) {
    const a = plan[i];
    const b = plan[i + dir];
    if (!a || !b) return;
    // Renumber so positions are always distinct, then swap.
    const order = plan.map((p) => p.id);
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    for (const [pos, pid] of order.entries()) {
      const item = plan.find((p) => p.id === pid)!;
      if (item.position !== pos) await patch('plan_items', pid, { position: pos });
    }
  }

  async function bump(p: PlanItem, field: 'target_sets' | 'target_reps', d: number) {
    const v = Math.max(1, Math.min(50, p[field] + d));
    if (v !== p[field]) await patch('plan_items', p.id, { [field]: v });
  }

  async function del(p: PlanItem) {
    const name = store.exerciseById.get(p.exercise)?.name;
    if (confirm(`${name} van deze dag verwijderen? Je geschiedenis blijft bewaard.`)) await remove('plan_items', p.id);
  }
</script>

{#if day}
  <div class="page">
    <div class="header"><a class="back" href="#/schedule">‹ Schema</a></div>
    <span class="eyebrow">{weekdayName(day.weekday)}</span>
    <input class="field title" value={day.name} onchange={rename} aria-label="Naam" />

    <div class="segmented">
      <button class:on={day.kind === 'strength'} onclick={() => setKind('strength')}>Kracht</button>
      <button class:on={day.kind === 'cardio'} onclick={() => setKind('cardio')}>Cardio</button>
      <button class:on={day.kind === 'rest'} onclick={() => setKind('rest')}>Rust</button>
    </div>

    {#if day.kind === 'strength'}
      {#if plan.length}
        <div class="list">
          {#each plan as p, i (p.id)}
            <div class="item">
              <div class="spread">
                <span class="name">{store.exerciseById.get(p.exercise)?.name ?? '—'}</span>
                <div class="order">
                  <button aria-label="Omhoog" disabled={i === 0} onclick={() => move(i, -1)}>▲</button>
                  <button aria-label="Omlaag" disabled={i === plan.length - 1} onclick={() => move(i, 1)}>▼</button>
                  <button aria-label="Verwijderen" class="x" onclick={() => del(p)}>✕</button>
                </div>
              </div>
              <div class="targets">
                <div class="mini">
                  <button onclick={() => bump(p, 'target_sets', -1)}>−</button>
                  <span class="num">{p.target_sets}</span>
                  <button onclick={() => bump(p, 'target_sets', 1)}>+</button>
                  <span class="muted small">sets</span>
                </div>
                <span class="muted">×</span>
                <div class="mini">
                  <button onclick={() => bump(p, 'target_reps', -1)}>−</button>
                  <span class="num">{p.target_reps}</span>
                  <button onclick={() => bump(p, 'target_reps', 1)}>+</button>
                  <span class="muted small">reps</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty">Nog geen oefeningen.</p>
      {/if}

      <form class="add" onsubmit={add}>
        <input class="field" list="exercise-library" placeholder="Oefening toevoegen…" bind:value={newName} autocapitalize="words" />
        <datalist id="exercise-library">
          {#each library as e (e.id)}<option value={e.name}></option>{/each}
        </datalist>
        <button class="btn primary" disabled={!newName.trim()}>Toevoegen</button>
      </form>
    {:else if day.kind === 'cardio'}
      <p class="muted">Cardiodag: je logt of de training gedaan is, je gemiddelde hartslag en een notitie. Met ingebouwde 4×4-timer.</p>
    {:else}
      <p class="muted">Rustdag.</p>
    {/if}
  </div>
{/if}

<style>
  .title {
    font-size: 28px;
    font-weight: 700;
    padding: 10px 14px;
  }
  .item {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .item + .item {
    border-top: 1px solid var(--line);
  }
  .name {
    font-weight: 600;
  }
  .order {
    display: flex;
    gap: 6px;
  }
  .order button {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--muted);
  }
  .order button:disabled {
    opacity: 0.3;
  }
  .order .x {
    color: var(--down);
  }
  .targets {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .mini {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mini button {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--surface-2);
    font-size: 20px;
  }
  .mini .num {
    min-width: 24px;
    text-align: center;
    font-weight: 700;
    font-size: 20px;
  }
  .add {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
