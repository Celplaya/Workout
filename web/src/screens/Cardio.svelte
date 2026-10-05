<script lang="ts">
  import { untrack } from 'svelte';
  import Stepper from '../components/Stepper.svelte';
  import SyncDot from '../components/SyncDot.svelte';
  import { deleteSession, patch, store } from '../lib/data.svelte';
  import { clock as fmt } from '../lib/format';
  import { go } from '../lib/router.svelte';
  import { beep, unlockAudio } from '../lib/sound';
  import { clock, interval, intervalPhase, startInterval, stopInterval } from '../lib/timers.svelte';
  import { keepAwake } from '../lib/wakelock';

  let { id }: { id: string } = $props();
  // Looked up by id so the screen stays valid while it is being closed.
  const session = $derived(store.sessionById.get(id)!);

  $effect(() => {
    keepAwake(true);
    return () => keepAwake(false);
  });

  const running = $derived(interval.start > 0 && interval.session === session.id);
  const phase = $derived(running ? intervalPhase((clock.now - interval.start) / 1000) : null);

  // Beep on every phase change; mark the workout done when the last interval ends.
  let lastIndex = -1;
  $effect(() => {
    if (!phase) {
      lastIndex = -1;
      return;
    }
    if (lastIndex !== -1 && phase.index !== lastIndex) beep(phase.phase === 'work' ? 2 : 1);
    if (phase.phase === 'done' && !session.cardio_done) {
      beep(3);
      void patch('sessions', session.id, { cardio_done: true });
    }
    lastIndex = phase.index;
  });

  let hr = $state(untrack(() => session.avg_hr) || 0);
  let note = $state(untrack(() => session.note));
  $effect(() => {
    const v = hr;
    if (v !== session.avg_hr) void patch('sessions', session.id, { avg_hr: v });
  });

  async function saveNote() {
    if (note !== session.note) await patch('sessions', session.id, { note });
  }

  function start() {
    unlockAudio();
    startInterval(session.id);
  }

  function stop() {
    if (confirm('Timer stoppen?')) stopInterval();
  }

  async function finish() {
    await saveNote();
    stopInterval();
    await patch('sessions', session.id, { finished: Date.now() });
    go('summary/' + session.id, true);
  }

  async function discard() {
    if (!confirm('Deze sessie verwijderen?')) return;
    stopInterval();
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
  <h1>{session.day_name}</h1>

  <div class="card timer" class:work={phase?.phase === 'work'}>
    {#if phase}
      {#if phase.phase === 'done'}
        <span class="eyebrow">Klaar</span>
        <span class="time">4×4 ✓</span>
      {:else}
        <span class="eyebrow">Ronde {phase.round}/4 · {phase.phase === 'work' ? 'Intensief · RPE 8–9' : 'Actief herstel'}</span>
        <span class="time num">{fmt(phase.remaining)}</span>
      {/if}
      <button class="btn" onclick={phase.phase === 'done' ? stopInterval : stop}>{phase.phase === 'done' ? 'Sluiten' : 'Stop timer'}</button>
    {:else}
      <span class="eyebrow">Norwegian 4×4</span>
      <p class="muted small" style="margin:0">4 × 4 min intensief, 3 min actief herstel. Piept bij elke wissel (scherm blijft aan).</p>
      <button class="btn primary big" onclick={start}>Start intervaltimer</button>
    {/if}
  </div>

  <div class="card stack">
    <span class="eyebrow">Gedaan?</span>
    <div class="segmented">
      <button class:on={session.cardio_done} onclick={() => patch('sessions', session.id, { cardio_done: true })}>Ja</button>
      <button class:on={!session.cardio_done} onclick={() => patch('sessions', session.id, { cardio_done: false })}>Nee</button>
    </div>
  </div>

  <div class="card stack">
    <span class="eyebrow">Gemiddelde hartslag</span>
    <Stepper bind:value={hr} step={1} unit="bpm" integer />
  </div>

  <div class="card stack">
    <span class="eyebrow">Notitie</span>
    <textarea class="field" rows="3" bind:value={note} onblur={saveNote} placeholder="Loopband 12 km/u, 3% helling…"></textarea>
  </div>

  <button class="btn big primary" onclick={finish}>Sessie afronden</button>
  <button class="btn ghost danger small" onclick={discard}>Sessie verwijderen</button>
</div>

<style>
  .timer {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .time {
    font-size: 72px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .work .time {
    color: var(--accent);
  }
</style>
