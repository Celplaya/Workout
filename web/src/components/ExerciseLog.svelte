<script lang="ts">
  import Stepper from './Stepper.svelte';
  import { exerciseIncrement, logSet, remove, store } from '../lib/data.svelte';
  import { kg } from '../lib/format';
  import { byIdx, describeSets, lastPerformance, overloadSuggestion, prKind, prefill } from '../lib/stats';
  import { showToast } from '../lib/toast.svelte';
  import { startRest } from '../lib/timers.svelte';
  import { unlockAudio } from '../lib/sound';
  import type { Session } from '../lib/types';

  let {
    session,
    exercise,
    targetSets,
    targetReps,
    open,
    onopen,
    oncomplete,
  }: {
    session: Session;
    exercise: string;
    targetSets: number;
    targetReps: number;
    open: boolean;
    onopen: () => void;
    oncomplete: () => void;
  } = $props();

  const name = $derived(store.exerciseById.get(exercise)?.name ?? '—');
  const done = $derived(
    (store.setsBySession.get(session.id) ?? []).filter((s) => s.exercise === exercise).sort(byIdx),
  );
  const prev = $derived(lastPerformance(store.setsByExercise.get(exercise) ?? [], store.sessionById, session));
  const step = $derived(exerciseIncrement(exercise));
  const suggestion = $derived(overloadSuggestion(prev?.sets ?? [], targetSets, targetReps, step));
  const complete = $derived(targetSets > 0 && done.length >= targetSets);

  let weight = $state(0);
  let reps = $state(0);
  let seen = -1;

  // Pre-fill the steppers whenever the number of logged sets changes.
  $effect(() => {
    const n = done.length;
    if (n === seen) return;
    seen = n;
    const p = prefill(done, prev?.sets, targetReps);
    weight = p.weight;
    reps = p.reps;
  });

  let busy = false;
  async function log() {
    if (busy) return;
    busy = true;
    unlockAudio();
    const earlier = store.setsByExercise.get(exercise) ?? [];
    const pr = prKind({ weight, reps, session: session.id }, earlier);
    const willComplete = targetSets > 0 && done.length + 1 === targetSets;
    await logSet(session, exercise, weight, reps);
    startRest(store.prefs.rest_seconds);
    if (pr === 'weight') showToast(`★ PR — zwaarste ${name}: ${kg(weight)} kg`, 'pr', 4500);
    else if (pr === 'reps') showToast(`★ PR — ${reps} reps @ ${kg(weight)} kg`, 'pr', 4500);
    busy = false;
    if (willComplete) oncomplete();
  }

  async function removeSet(id: string, i: number) {
    if (confirm(`Set ${i + 1} verwijderen?`)) await remove('sets', id);
  }
</script>

<section class="ex" class:open class:complete>
  <button class="head" onclick={onopen}>
    <div class="title">
      <h3>{name}</h3>
      {#if prev}<div class="small muted">vorige: {describeSets(prev.sets)}</div>{/if}
    </div>
    <div class="progress num" class:up={complete}>
      {done.length}<span class="muted">/{targetSets || '–'}</span>
      {#if targetReps}<span class="muted small"> ×{targetReps}</span>{/if}
    </div>
  </button>

  {#if open}
    <div class="body">
      {#if done.length}
        <div class="sets">
          {#each done as s, i (s.id)}
            <button class="set num" onclick={() => removeSet(s.id, i)}>
              <span class="muted">{i + 1}</span>
              {kg(s.weight)}<span class="muted">×</span>{s.reps}
            </button>
          {/each}
        </div>
      {/if}

      {#if suggestion && !done.length && weight !== suggestion}
        <button class="chip accent hint" onclick={() => (weight = suggestion!)}>
          ↑ Vorige keer alles gehaald — probeer {kg(suggestion)} kg
        </button>
      {/if}

      <Stepper bind:value={weight} step={step} unit="kg" />
      <Stepper bind:value={reps} step={1} unit="reps" integer />
      <button class="btn primary big" onclick={log}>
        {complete ? 'Extra set loggen' : `Set ${done.length + 1} loggen`}
      </button>
    </div>
  {/if}
</section>

<style>
  .ex {
    background: var(--surface);
    border-radius: var(--radius);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 16px;
    text-align: left;
  }
  .complete:not(.open) .head h3 {
    color: var(--muted);
  }
  .progress {
    font-size: 22px;
    font-weight: 700;
    white-space: nowrap;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px 16px;
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
  .hint {
    align-self: flex-start;
    padding: 10px 14px;
  }
</style>
