<script lang="ts">
  import { acceptProposal, dismissProposal, store } from '../lib/data.svelte';
  import { amount, target } from '../lib/format';
  import { STREAK, type Proposal } from '../lib/progress';
  import { showToast } from '../lib/toast.svelte';

  const list = $derived(store.proposals);
  let busy = $state('');

  const dayName = (p: Proposal) =>
    p.kind === 'skill' ? '' : (store.days.find((d) => d.id === p.item.day)?.name ?? '');

  async function accept(p: Proposal) {
    if (busy) return;
    busy = p.key;
    await acceptProposal(p);
    busy = '';
    if (p.kind === 'skill') showToast(`✓ Skill gehaald: ${p.skill.name}`, 'pr', 4500);
    else if (p.kind === 'swap') showToast(`${p.to.name} staat nu in je schema`, '', 3500);
    else showToast(`Nieuw doel: ${target(p.item.target_sets, p.to, p.exercise.measure)}`, '', 3500);
  }

  async function later(p: Proposal) {
    if (busy) return;
    busy = p.key;
    await dismissProposal(p);
    busy = '';
  }
</script>

{#if list.length}
  <div class="stack">
    {#each list as p (p.key)}
      <div class="card proposal" class:skill={p.kind === 'skill'}>
        {#if p.kind === 'skill'}
          {@const ex = store.exerciseById.get(p.skill.exercise)}
          <span class="eyebrow">Skill gehaald</span>
          <h3>{p.skill.name}</h3>
          <p class="small muted">
            {STREAK} sessies op rij het doel gehaald · beste {amount(p.best, ex?.measure)}
          </p>
          <div class="actions">
            <button class="btn primary" disabled={!!busy} onclick={() => accept(p)}>✓ Afvinken</button>
            <button class="btn ghost" disabled={!!busy} onclick={() => later(p)}>Niet nu</button>
          </div>
        {:else if p.kind === 'swap'}
          <span class="eyebrow">Volgende stap · {dayName(p)}</span>
          <h3>{p.from.name} → {p.to.name}</h3>
          <p class="small muted">
            {target(p.item.target_sets, p.item.target_reps, p.from.measure)} {STREAK}× op rij gehaald. Start
            {p.to.name} op {target(p.sets, p.target, p.to.measure)}.
          </p>
          <div class="actions">
            <button class="btn primary" disabled={!!busy} onclick={() => accept(p)}>Vervangen</button>
            <button class="btn ghost" disabled={!!busy} onclick={() => later(p)}>Niet nu</button>
          </div>
        {:else}
          <span class="eyebrow">Doel verhogen · {dayName(p)}</span>
          <h3>{p.exercise.name}</h3>
          <p class="small muted">
            {target(p.item.target_sets, p.from, p.exercise.measure)} {STREAK}× op rij gehaald. Nieuw doel:
            {target(p.item.target_sets, p.to, p.exercise.measure)}.
          </p>
          <div class="actions">
            <button class="btn primary" disabled={!!busy} onclick={() => accept(p)}>Verhogen</button>
            <button class="btn ghost" disabled={!!busy} onclick={() => later(p)}>Niet nu</button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .proposal {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--line);
  }
  .proposal.skill {
    border-color: var(--accent);
  }
  .proposal.skill .eyebrow {
    color: var(--accent);
  }
  p {
    margin: 0;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 6px;
  }
</style>
