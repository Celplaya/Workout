<script lang="ts">
  import Proposals from '../components/Proposals.svelte';
  import { patch, remove, save, setSkillAchieved, store } from '../lib/data.svelte';
  import { shortDate } from '../lib/dates';
  import { amount } from '../lib/format';
  import { newId } from '../lib/id';
  import { userId } from '../lib/pb';
  import { TIERS } from '../lib/program';
  import { skillBest } from '../lib/progress';
  import { showToast } from '../lib/toast.svelte';
  import type { Skill } from '../lib/types';

  const sorted = $derived([...store.skills].sort((a, b) => a.tier - b.tier || a.position - b.position));
  const open = $derived(sorted.filter((s) => !s.achieved_at));
  const done = $derived(sorted.filter((s) => s.achieved_at).sort((a, b) => b.achieved_at - a.achieved_at));
  const library = $derived(
    store.exercises.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name, 'nl')),
  );

  let editing = $state('');
  let showDone = $state(false);
  let newName = $state('');
  let newTier = $state(2);

  function info(s: Skill) {
    const ex = s.exercise ? store.exerciseById.get(s.exercise) : undefined;
    const best = skillBest(s, store.setsByExercise);
    const pct = s.goal > 0 ? Math.min(1, best / s.goal) : 0;
    return { ex, best, pct };
  }

  async function toggle(s: Skill) {
    if (s.achieved_at) {
      if (!confirm(`${s.name} weer openzetten?`)) return;
      await setSkillAchieved(s, false);
    } else {
      await setSkillAchieved(s, true);
      showToast(`✓ Skill gehaald: ${s.name}`, 'pr', 4500);
    }
  }

  async function add(e: Event) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    newName = '';
    const position = store.skills.length ? Math.max(...store.skills.map((x) => x.position)) + 1 : 0;
    const id = newId();
    await save('skills', { id, user: userId(), name, tier: newTier, position, exercise: '', goal: 0, achieved_at: 0, note: '' });
    editing = id;
  }

  async function bumpGoal(s: Skill, d: number) {
    await patch('skills', s.id, { goal: Math.max(0, (s.goal || 0) + d) });
  }

  async function del(s: Skill) {
    if (confirm(`${s.name} verwijderen?`)) {
      editing = '';
      await remove('skills', s.id);
    }
  }
</script>

<div class="page">
  <div class="header"><h1>Skills</h1></div>

  <div class="card stack">
    <div class="spread">
      <span class="eyebrow">Gehaald</span>
      <span class="num"><b>{done.length}</b><span class="muted"> / {sorted.length}</span></span>
    </div>
    <div class="bar"><div style="width:{sorted.length ? (done.length / sorted.length) * 100 : 0}%"></div></div>
    <span class="small muted">De app vinkt een skill voor je aan als je het doel 2 sessies op rij haalt. Je kunt ook zelf afvinken.</span>
  </div>

  <Proposals />

  {#each TIERS as t (t.tier)}
    {@const items = open.filter((s) => s.tier === t.tier)}
    {#if items.length}
      <div class="tier">
        <span class="eyebrow">{t.label}</span>
        <span class="small muted">{t.hint}</span>
      </div>
      <div class="list">
        {#each items as s (s.id)}
          {@const x = info(s)}
          <div class="skill">
            <div class="line">
              <button class="check" aria-label="Afvinken" onclick={() => toggle(s)}></button>
              <button class="body" onclick={() => (editing = editing === s.id ? '' : s.id)}>
                <span class="name">{s.name}</span>
                {#if x.ex && s.goal > 0}
                  <span class="small muted num">
                    {x.best ? `beste ${amount(x.best, x.ex.measure)}` : 'nog niet gelogd'} · doel {amount(s.goal, x.ex.measure)}
                  </span>
                  <span class="bar thin"><span style="width:{x.pct * 100}%"></span></span>
                {:else if s.note}
                  <span class="small muted">{s.note}</span>
                {/if}
              </button>
            </div>
            {#if editing === s.id}
              {@render editor(s)}
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/each}

  <form class="add" onsubmit={add}>
    <input class="field" placeholder="Skill toevoegen, bijv. Crow pose (20 s)" bind:value={newName} />
    <div class="segmented">
      {#each TIERS as t (t.tier)}
        <button type="button" class:on={newTier === t.tier} onclick={() => (newTier = t.tier)}>{t.label.split(' ')[0]}</button>
      {/each}
    </div>
    <button class="btn" disabled={!newName.trim()}>Toevoegen</button>
  </form>

  {#if done.length}
    <button class="tier toggle-done" onclick={() => (showDone = !showDone)}>
      <span class="eyebrow">Gehaald ({done.length})</span>
      <span class="small muted">{showDone ? 'verbergen' : 'tonen'}</span>
    </button>
    {#if showDone}
      <div class="list">
        {#each done as s (s.id)}
          <div class="skill">
            <div class="line">
              <button class="check on" aria-label="Weer openzetten" onclick={() => toggle(s)}>✓</button>
              <button class="body" onclick={() => (editing = editing === s.id ? '' : s.id)}>
                <span class="name">{s.name}</span>
                <span class="small muted">{shortDate(new Date(s.achieved_at))}</span>
              </button>
            </div>
            {#if editing === s.id}
              {@render editor(s)}
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#snippet editor(s: Skill)}
  {@const ex = s.exercise ? store.exerciseById.get(s.exercise) : undefined}
  <div class="edit">
    <input class="field" value={s.name} aria-label="Naam" onchange={(e) => { const name = e.currentTarget.value.trim(); if (name) patch('skills', s.id, { name }); }} />
    <label class="small muted" for={'ex-' + s.id}>Gemeten met oefening</label>
    <select id={'ex-' + s.id} class="field" value={s.exercise ?? ''} onchange={(e) => patch('skills', s.id, { exercise: e.currentTarget.value })}>
      <option value="">— zelf afvinken —</option>
      {#each library as e (e.id)}<option value={e.id}>{e.name}</option>{/each}
    </select>
    {#if s.exercise}
      <div class="goal">
        <span class="small muted">Doel in één set</span>
        <div class="mini">
          <button onclick={() => bumpGoal(s, -1)}>−</button>
          <span class="num">{s.goal || 0}</span>
          <button onclick={() => bumpGoal(s, 1)}>+</button>
          <span class="muted small">{ex?.measure === 'seconds' ? 'sec' : ex?.measure === 'minutes' ? 'min' : 'reps'}</span>
        </div>
      </div>
      <a class="small link" href={'#/exercise/' + s.exercise}>Geschiedenis van {ex?.name} ›</a>
    {/if}
    <div class="segmented">
      {#each TIERS as t (t.tier)}
        <button class:on={s.tier === t.tier} onclick={() => patch('skills', s.id, { tier: t.tier })}>{t.label.split(' ')[0]}</button>
      {/each}
    </div>
    <input class="field" placeholder="Notitie" value={s.note ?? ''} onchange={(e) => patch('skills', s.id, { note: e.currentTarget.value.trim() })} />
    <button class="btn ghost danger small" onclick={() => del(s)}>Verwijderen</button>
  </div>
{/snippet}

<style>
  .tier {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 4px 0;
  }
  .toggle-done {
    width: 100%;
  }
  .bar {
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .bar > :global(*) {
    display: block;
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
  }
  .bar.thin {
    display: block;
    height: 4px;
    margin-top: 6px;
  }
  .skill + .skill {
    border-top: 1px solid var(--line);
  }
  .line {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    min-height: 60px;
  }
  .check {
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid var(--muted);
    display: grid;
    place-items: center;
    font-weight: 700;
    color: var(--accent-ink);
  }
  .check.on {
    background: var(--accent);
    border-color: var(--accent);
  }
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    text-align: left;
    min-width: 0;
  }
  .name {
    font-weight: 600;
  }
  .edit {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 16px 16px;
  }
  .goal {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    min-width: 28px;
    text-align: center;
    font-weight: 700;
    font-size: 20px;
  }
  .link {
    color: var(--accent);
    text-decoration: none;
  }
  .add {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
