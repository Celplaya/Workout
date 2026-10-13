<script lang="ts">
  import Chart from '../components/Chart.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { parseDate, shortDate } from '../lib/dates';
  import { patch, store } from '../lib/data.svelte';
  import { amount, kg, stepperUnit, volume } from '../lib/format';
  import { byIdx, describeSets, groupBy, prMap, volumeOf, weeklySeries, workOf } from '../lib/stats';
  import type { Measure } from '../lib/types';

  let { id }: { id: string } = $props();

  const ex = $derived(store.exerciseById.get(id));
  const sets = $derived(store.setsByExercise.get(id) ?? []);
  const series = $derived(weeklySeries(sets, store.sessionById).slice(-16));
  const best = $derived(
    sets.length ? sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a)) : null,
  );
  const prs = $derived(prMap(sets));
  const measure = $derived<Measure>(ex?.measure || 'reps');
  const weighted = $derived(sets.some((s) => s.weight > 0));
  const unit = $derived(stepperUnit(measure));
  const library = $derived(
    store.exercises.filter((e) => e.id !== id && !e.archived).sort((a, b) => a.name.localeCompare(b.name, 'nl')),
  );
  const nextEx = $derived(ex?.next ? store.exerciseById.get(ex.next) : undefined);
  const prevEx = $derived(store.exercises.filter((e) => e.next === id));

  async function setMeasure(m: Measure) {
    if (ex && m !== measure) await patch('exercises', ex.id, { measure: m });
  }

  async function setNext(e: Event) {
    const next = (e.currentTarget as HTMLSelectElement).value;
    if (ex && next !== ex.next) await patch('exercises', ex.id, { next });
  }

  async function bumpDefault(field: 'default_sets' | 'default_target', d: number) {
    if (!ex) return;
    const v = Math.max(0, (ex[field] || 0) + d);
    await patch('exercises', ex.id, { [field]: v });
  }

  async function setCue(e: Event) {
    const cue = (e.currentTarget as HTMLInputElement).value.trim();
    if (ex && cue !== (ex.cue ?? '')) await patch('exercises', ex.id, { cue });
  }

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
          <span class="eyebrow">{measure === 'seconds' ? 'Langste hold' : 'Beste set'}</span>
          <div class="big num">{weighted ? `${kg(best.weight)} kg × ${best.reps}` : amount(best.reps, measure)}</div>
        </div>
        <span class="chip accent">★ {prs.size} PR's</span>
      </div>
    {/if}

    {#if weighted}
      <div class="card stack">
        <span class="eyebrow">Zwaarste gewicht per week (kg)</span>
        <Chart points={series.map((p) => ({ label: label(p.week), value: p.best }))} format={(n) => `${kg(n)} kg`} />
      </div>
      <div class="card stack">
        <span class="eyebrow">Volume per week (kg × reps)</span>
        <Chart kind="bar" points={series.map((p) => ({ label: label(p.week), value: p.volume }))} format={(n) => `${volume(n)} kg`} />
      </div>
    {:else}
      <div class="card stack">
        <span class="eyebrow">Beste set per week ({unit})</span>
        <Chart points={series.map((p) => ({ label: label(p.week), value: p.bestValue }))} format={(n) => amount(n, measure)} />
      </div>
      <div class="card stack">
        <span class="eyebrow">Totaal per week ({unit})</span>
        <Chart kind="bar" points={series.map((p) => ({ label: label(p.week), value: p.total }))} format={(n) => amount(n, measure)} />
      </div>
    {/if}

    <div class="card stack">
      <span class="eyebrow">Meten in</span>
      <div class="segmented">
        <button class:on={measure === 'reps'} onclick={() => setMeasure('reps')}>Reps</button>
        <button class:on={measure === 'seconds'} onclick={() => setMeasure('seconds')}>Seconden</button>
        <button class:on={measure === 'minutes'} onclick={() => setMeasure('minutes')}>Minuten</button>
      </div>
      <span class="eyebrow" style="margin-top:8px">Tip tijdens het loggen</span>
      <input class="field" placeholder="Bijv. 5 sec zakken" value={ex.cue ?? ''} onchange={setCue} />
    </div>

    <div class="card stack">
      <span class="eyebrow">Progressie</span>
      {#if prevEx.length}
        <span class="small muted">Komt na: {prevEx.map((e) => e.name).join(', ')}</span>
      {/if}
      <label class="small muted" for="next">Volgende stap (na 2× op rij je doel)</label>
      <select id="next" class="field" value={ex.next ?? ''} onchange={setNext}>
        <option value="">— geen —</option>
        {#each library as e (e.id)}<option value={e.id}>{e.name}</option>{/each}
      </select>
      {#if nextEx}
        <span class="small muted">Als {ex.name} hierdoor wordt vervangen, start hij op:</span>
      {:else}
        <label class="toggle">
          <input type="checkbox" checked={!!ex.progress} onchange={(e) => patch('exercises', ex.id, { progress: e.currentTarget.checked })} />
          <span>Doel automatisch voorstellen te verhogen</span>
        </label>
        <span class="small muted">Startdoel als deze oefening een andere vervangt:</span>
      {/if}
      <div class="defaults">
        <div class="mini">
          <button onclick={() => bumpDefault('default_sets', -1)}>−</button>
          <span class="num">{ex.default_sets || '–'}</span>
          <button onclick={() => bumpDefault('default_sets', 1)}>+</button>
          <span class="muted small">sets</span>
        </div>
        <span class="muted">×</span>
        <div class="mini">
          <button onclick={() => bumpDefault('default_target', -1)}>−</button>
          <span class="num">{ex.default_target || '–'}</span>
          <button onclick={() => bumpDefault('default_target', 1)}>+</button>
          <span class="muted small">{unit}</span>
        </div>
      </div>
    </div>

    {#if measure === 'reps'}
      <div class="card stack">
        <span class="eyebrow">Stapgrootte gewicht</span>
        <div onfocusout={saveIncrement} onclick={() => setTimeout(saveIncrement)} role="presentation">
          <Stepper bind:value={increment} step={0.25} min={0.25} unit="kg" />
        </div>
      </div>
    {/if}

    <span class="eyebrow">Geschiedenis</span>
    {#if sessions.length}
      <div class="list">
        {#each sessions as x (x.s!.id)}
          <a class="row" href={'#/summary/' + x.s!.id}>
            <div>
              <div class="num">{describeSets(x.sets, measure)}{#if x.sets.some((s) => prs.has(s.id))} <span class="up">★</span>{/if}</div>
              <div class="small muted">{shortDate(parseDate(x.s!.date))} · {x.s!.day_name}</div>
            </div>
            <span class="num muted small">{weighted ? `${volume(volumeOf(x.sets))} kg` : amount(workOf(x.sets), measure)}</span>
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
  .toggle {
    display: flex;
    gap: 10px;
    align-items: center;
    min-height: 44px;
  }
  .toggle input {
    width: 22px;
    height: 22px;
    accent-color: var(--accent);
  }
  .defaults {
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
</style>
