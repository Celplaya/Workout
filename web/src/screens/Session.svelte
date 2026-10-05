<script lang="ts">
  import ExerciseLog from '../components/ExerciseLog.svelte';
  import SyncDot from '../components/SyncDot.svelte';
  import { deleteSession, patch, planFor, store } from '../lib/data.svelte';
  import { clock as fmt } from '../lib/format';
  import { go } from '../lib/router.svelte';
  import { byIdx } from '../lib/stats';
  import { clock, stopRest } from '../lib/timers.svelte';
  import { keepAwake } from '../lib/wakelock';

  let { id }: { id: string } = $props();
  // Looked up by id so the screen stays valid while it is being closed.
  const session = $derived(store.sessionById.get(id)!);

  $effect(() => {
    keepAwake(true);
    return () => keepAwake(false);
  });

  const items = $derived.by(() => {
    const plan = planFor(session.day).map((p) => ({
      exercise: p.exercise,
      targetSets: p.target_sets,
      targetReps: p.target_reps,
    }));
    // Exercises logged in this session that are no longer in the plan stay visible.
    const extra = [...new Set((store.setsBySession.get(session.id) ?? []).sort(byIdx).map((s) => s.exercise))]
      .filter((id) => !plan.some((p) => p.exercise === id))
      .map((exercise) => ({ exercise, targetSets: 0, targetReps: 0 }));
    return [...plan, ...extra];
  });

  const setCount = $derived((store.setsBySession.get(session.id) ?? []).length);

  // Open the first exercise that still needs sets.
  let open = $state<string | null>(null);
  $effect(() => {
    if (open !== null || !items.length) return;
    const done = store.setsBySession.get(session.id) ?? [];
    const first = items.find((it) => done.filter((s) => s.exercise === it.exercise).length < it.targetSets);
    open = (first ?? items[0]).exercise;
  });

  function advance(i: number) {
    const done = store.setsBySession.get(session.id) ?? [];
    const next = items.slice(i + 1).find((it) => done.filter((s) => s.exercise === it.exercise).length < it.targetSets);
    if (next) open = next.exercise;
  }

  async function finish() {
    if (!setCount && !confirm('Nog geen sets gelogd. Toch afronden?')) return;
    await patch('sessions', session.id, { finished: Date.now() });
    stopRest();
    go('summary/' + session.id, true);
  }

  async function discard() {
    if (!confirm('Deze sessie en alle sets verwijderen?')) return;
    stopRest();
    const sid = session.id;
    go('', true);
    await deleteSession(sid);
  }
</script>

<div class="page no-tabs">
  <div class="header">
    <button class="back" onclick={() => go('')}>‹ Vandaag</button>
    <SyncDot />
  </div>
  <div class="spread">
    <h1>{session.day_name}</h1>
    <span class="num muted elapsed">{fmt((clock.now - session.started) / 1000)}</span>
  </div>

  {#if !items.length}
    <div class="card empty">
      Geen oefeningen gepland voor deze dag.<br /><a href={'#/day/' + session.day}>Voeg ze toe in Schema →</a>
    </div>
  {/if}

  {#each items as it, i (it.exercise)}
    <ExerciseLog
      {session}
      exercise={it.exercise}
      targetSets={it.targetSets}
      targetReps={it.targetReps}
      open={open === it.exercise}
      onopen={() => (open = open === it.exercise ? '' : it.exercise)}
      oncomplete={() => advance(i)}
    />
  {/each}

  <button class="btn big" onclick={finish}>Sessie afronden</button>
  <button class="btn ghost danger small" onclick={discard}>Sessie verwijderen</button>
</div>

<style>
  .elapsed {
    font-size: 20px;
    font-weight: 600;
  }
  .card a {
    color: var(--accent);
  }
</style>
