<script lang="ts">
  import { sync } from '../lib/sync.svelte';

  const state = $derived(!sync.online ? 'offline' : sync.pending > 0 ? 'pending' : 'ok');
  const label = $derived(
    state === 'offline' ? `Offline${sync.pending ? ` · ${sync.pending}` : ''}` : state === 'pending' ? `${sync.pending}` : '',
  );
</script>

<a href="#/settings" class="sync {state}" aria-label="Synchronisatie">
  <span class="dot"></span>
  {#if label}<span>{label}</span>{/if}
</a>

<style>
  .sync {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    text-decoration: none;
    padding: 8px 0 8px 8px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .pending .dot {
    background: var(--muted);
  }
  .offline .dot {
    background: var(--down);
  }
</style>
