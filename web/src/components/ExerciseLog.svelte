<script lang="ts">
  import Stepper from './Stepper.svelte';
  import { exerciseIncrement, logSet, remove, store } from '../lib/data.svelte';
  import { amount, kg, stepperUnit, target as fmtTarget } from '../lib/format';
  import { byIdx, describeSets, lastPerformance, overloadSuggestion, prKind, prefill } from '../lib/stats';
  import { showToast } from '../lib/toast.svelte';
  import { clock, startRest, stopRest } from '../lib/timers.svelte';
  import { beep, unlockAudio } from '../lib/sound';
  import type { Session } from '../lib/types';

  let {
    session,
    exercise,
    targetSets,
    targetReps,
    note = '',
    restSeconds = 0,
    open,
    onopen,
    oncomplete,
  }: {
    session: Session;
    exercise: string;
    targetSets: number;
    targetReps: number;
    note?: string;
    restSeconds?: number;
    open: boolean;
    onopen: () => void;
    oncomplete: () => void;
  } = $props();

  const ex = $derived(store.exerciseById.get(exercise));
  const name = $derived(ex?.name ?? '—');
  const measure = $derived(ex?.measure || 'reps');
  const isHold = $derived(measure === 'seconds');
  const timed = $derived(measure !== 'reps');
  const hint = $derived([note, ex?.cue].filter(Boolean).join(' · '));
  const done = $derived(
    (store.setsBySession.get(session.id) ?? []).filter((s) => s.exercise === exercise).sort(byIdx),
  );
  const prev = $derived(lastPerformance(store.setsByExercise.get(exercise) ?? [], store.sessionById, session));
  const step = $derived(exerciseIncrement(exercise));
  const suggestion = $derived(overloadSuggestion(prev?.sets ?? [], targetSets, targetReps, step));
  const complete = $derived(targetSets > 0 && done.length >= targetSets);
  const best = $derived(done.reduce((m, s) => Math.max(m, s.reps), 0));

  let weight = $state(0);
  let reps = $state(0);
  let seen = -1;

  // Pre-fill the steppers whenever the number of logged sets changes.
  $effect(() => {
    const n = done.length;
    if (n === seen) return;
    seen = n;
    const p = prefill(done, prev?.sets, targetReps);
    weight = timed ? 0 : p.weight;
    reps = p.reps;
  });

  // ---- hold timer: counts up, beeps at the target, tap again to take the time ----
  let holdStart = $state(0);
  let beeped = false;
  const held = $derived(holdStart ? Math.floor((clock.now - holdStart) / 1000) : 0);
  $effect(() => {
    if (holdStart && !beeped && targetReps > 0 && held >= targetReps) {
      beeped = true;
      beep(1);
    }
  });
  function toggleHold() {
    unlockAudio();
    if (holdStart) {
      reps = held;
      holdStart = 0;
    } else {
      stopRest();
      beeped = false;
      holdStart = Date.now();
    }
  }

  let busy = false;
  async function log() {
    if (busy) return;
    busy = true;
    unlockAudio();
    if (holdStart) {
      reps = held;
      holdStart = 0;
    }
    const earlier = store.setsByExercise.get(exercise) ?? [];
    const pr = prKind({ weight, reps, session: session.id }, earlier);
    const willComplete = targetSets > 0 && done.length + 1 === targetSets;
    await logSet(session, exercise, weight, reps);
    startRest(restSeconds || store.prefs.rest_seconds);
    if (pr === 'weight') showToast(`★ PR — zwaarste ${name}: ${kg(weight)} kg`, 'pr', 4500);
    else if (pr === 'reps' && weight > 0) showToast(`★ PR — ${reps} reps @ ${kg(weight)} kg`, 'pr', 4500);
    else if (pr === 'reps') showToast(`★ PR — ${name}: ${amount(reps, measure)}`, 'pr', 4500);
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
      {#if prev}<div class="small muted">vorige: {describeSets(prev.sets, measure)}</div>{/if}
    </div>
    <div class="progress num" class:up={complete}>
      {done.length}<span class="muted">/{targetSets || '–'}</span>
      {#if targetReps}<span class="muted small"> ×{amount(targetReps, measure)}</span>{/if}
    </div>
  </button>

  {#if open}
    <div class="body">
      {#if hint}<p class="small muted hint-text">{hint}</p>{/if}
      {#if !targetReps && targetSets}
        <p class="small muted hint-text">Doel: {fmtTarget(targetSets, 0, measure)}{#if best} · beste vandaag {amount(best, measure)}{/if}</p>
      {/if}
      {#if done.length}
        <div class="sets">
          {#each done as s, i (s.id)}
            <button class="set num" onclick={() => removeSet(s.id, i)}>
              <span class="muted">{i + 1}</span>
              {#if timed}
                {amount(s.reps, measure)}
              {:else}
                {kg(s.weight)}<span class="muted">×</span>{s.reps}
              {/if}
            </button>
          {/each}
        </div>
      {/if}

      {#if suggestion && !done.length && weight !== suggestion}
        <button class="chip accent hint" onclick={() => (weight = suggestion!)}>
          ↑ Vorige keer alles gehaald — probeer {kg(suggestion)} kg
        </button>
      {/if}

      {#if isHold}
        <button class="btn big hold" class:running={!!holdStart} onclick={toggleHold}>
          {#if holdStart}
            <span class="num">{held} s</span><span class="small">tik om te stoppen</span>
          {:else}
            ⏱ Start hold-timer
          {/if}
        </button>
      {/if}
      {#if !timed}<Stepper bind:value={weight} step={step} unit="kg" />{/if}
      <Stepper bind:value={reps} step={1} unit={stepperUnit(measure)} integer />
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
  .hint-text {
    margin: 0;
  }
  .hold {
    flex-direction: column;
    gap: 0;
  }
  .hold.running {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
    font-size: 30px;
  }
</style>
