<script lang="ts">
  import { setGearOwned, skipGear, store } from '../lib/data.svelte';
  import { gearProposals, type GearAdvice } from '../lib/gear';
  import { showToast } from '../lib/toast.svelte';

  // compact: only the "buy now" cards (Vandaag). Otherwise the full overview.
  let { compact = false }: { compact?: boolean } = $props();

  const list = $derived(compact ? gearProposals(store.gear, store.dismissed) : store.gear);
  let open = $state('');

  const badge = (g: GearAdvice) =>
    g.have ? '✓ Heb ik' : g.status === 'now' ? 'Aanrader' : g.status === 'later' ? 'Nog niet' : 'Niet nodig';

  async function own(g: GearAdvice, owned: boolean) {
    await setGearOwned(g.id, owned);
    if (owned) showToast(`${g.name}: genoteerd`, '', 2500);
  }
</script>

{#if list.length}
  <div class="stack">
    {#each list as g (g.id)}
      {@const expanded = compact || open === g.id}
      <div class="card gear" class:now={g.status === 'now' && !g.have}>
        <button class="head" onclick={() => (open = open === g.id ? '' : g.id)} disabled={compact}>
          <span class="col">
            {#if compact}<span class="eyebrow">Materiaal</span>{/if}
            <h3>{g.name}</h3>
          </span>
          <span class="badge {g.have ? 'have' : g.status}">{badge(g)}</span>
        </button>
        <p class="small">{g.summary}</p>
        {#if expanded}
          <ul class="small muted">
            {#each g.points as p, i (i)}<li>{p}</li>{/each}
          </ul>
          {#if g.checks.length}
            <div class="checks">
              {#each g.checks as c (c.label)}
                <div class="check" class:done={c.done}>
                  <span class="dot">{c.done ? '✓' : ''}</span>
                  <span class="small">{c.label}<span class="muted"> · {c.detail}</span></span>
                </div>
              {/each}
            </div>
          {/if}
          {#if g.buy}<p class="small muted">{g.buy}</p>{/if}
        {/if}
        {#if g.status !== 'no'}
          <div class="actions">
            {#if g.have}
              <button class="btn ghost small" onclick={() => own(g, false)}>Toch niet</button>
            {:else}
              <button class="btn small" class:primary={compact} onclick={() => own(g, true)}>Heb ik al</button>
              {#if compact}
                <button class="btn ghost small" onclick={() => skipGear(g.id)}>Niet nu</button>
              {:else if !expanded}
                <button class="btn ghost small" onclick={() => (open = g.id)}>Waarom?</button>
              {/if}
            {/if}
          </div>
        {:else if !expanded}
          <button class="btn ghost small" onclick={() => (open = g.id)}>Waarom?</button>
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
  .gear {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--line);
  }
  .gear.now {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    width: 100%;
    color: inherit;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .badge {
    flex: none;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 9px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--muted);
  }
  .badge.now,
  .badge.have {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }
  p,
  ul {
    margin: 0;
  }
  ul {
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    line-height: 1.4;
  }
  .checks {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot {
    width: 18px;
    height: 18px;
    flex: none;
    border-radius: 50%;
    border: 1.5px solid var(--line);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 700;
  }
  .check.done .dot {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .actions .btn {
    flex: 1;
  }
</style>
