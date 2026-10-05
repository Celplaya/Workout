<script lang="ts">
  import { kg } from '../lib/format';

  let {
    value = $bindable(0),
    step = 1,
    min = 0,
    unit = '',
    integer = false,
  }: { value: number; step?: number; min?: number; unit?: string; integer?: boolean } = $props();

  let editing = $state(false);
  let draft = $state('');

  const round = (n: number) => (integer ? Math.round(n) : Math.round(n * 100) / 100);

  function bump(d: number) {
    value = Math.max(min, round(value + d));
  }

  function edit() {
    draft = value ? String(value).replace('.', ',') : '';
    editing = true;
  }

  function commit() {
    const n = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(n) && n >= min) value = round(n);
    editing = false;
  }

  function focus(el: HTMLInputElement) {
    el.focus();
    el.select();
  }
</script>

<div class="stepper">
  <button class="pm" onclick={() => bump(-step)} aria-label="Minder">−</button>
  {#if editing}
    <input
      class="num"
      use:focus
      inputmode={integer ? 'numeric' : 'decimal'}
      bind:value={draft}
      onblur={commit}
      onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  {:else}
    <button class="val" onclick={edit}>
      <span class="num">{kg(value)}</span>
      {#if unit}<span class="unit">{unit}</span>{/if}
    </button>
  {/if}
  <button class="pm" onclick={() => bump(step)} aria-label="Meer">+</button>
</div>

<style>
  .stepper {
    display: grid;
    grid-template-columns: 72px 1fr 72px;
    align-items: center;
    gap: 8px;
  }
  .pm {
    height: 64px;
    border-radius: 16px;
    background: var(--surface-2);
    font-size: 32px;
    font-weight: 400;
    line-height: 1;
  }
  .pm:active {
    background: var(--line);
  }
  .val,
  input {
    height: 64px;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  input {
    width: 100%;
    text-align: center;
    background: var(--surface-2);
    border: 1px solid var(--muted);
    border-radius: 16px;
    outline: none;
    min-width: 0;
  }
  .unit {
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
  }
</style>
