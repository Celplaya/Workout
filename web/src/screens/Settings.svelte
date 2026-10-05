<script lang="ts">
  import Stepper from '../components/Stepper.svelte';
  import { patch, resetLocal, store } from '../lib/data.svelte';
  import { clock as fmt } from '../lib/format';
  import { pb } from '../lib/pb';
  import { clearFailed, runSync, sync } from '../lib/sync.svelte';

  let { needRefresh = false, onupdate }: { needRefresh?: boolean; onupdate?: () => void } = $props();

  const settings = $derived(store.settings[0]);
  let rest = $state(120);
  let increment = $state(2.5);
  $effect(() => {
    rest = settings?.rest_seconds || 120;
    increment = settings?.increment || 2.5;
  });

  async function save() {
    if (!settings) return;
    if (rest !== settings.rest_seconds || increment !== settings.increment)
      await patch('settings', settings.id, { rest_seconds: rest, increment });
  }

  async function logout() {
    const msg = sync.pending
      ? `Er staan nog ${sync.pending} wijzigingen klaar die niet gesynchroniseerd zijn. Die gaan verloren. Toch uitloggen?`
      : 'Uitloggen?';
    if (!confirm(msg)) return;
    pb.authStore.clear();
    await resetLocal();
    localStorage.removeItem('uid');
    location.hash = '';
    location.reload();
  }

  const last = $derived(sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '—');
</script>

<div class="page">
  <div class="header"><h1>Instellingen</h1></div>

  {#if needRefresh}
    <button class="btn primary" onclick={onupdate}>Nieuwe versie beschikbaar — vernieuwen</button>
  {/if}

  <div class="card stack" onfocusout={save} onclick={() => setTimeout(save)} role="presentation">
    <span class="eyebrow">Rusttimer · {fmt(rest)}</span>
    <Stepper bind:value={rest} step={15} min={15} unit="s" integer />
    <span class="eyebrow" style="margin-top:8px">Standaard stapgrootte gewicht</span>
    <Stepper bind:value={increment} step={0.25} min={0.25} unit="kg" />
  </div>

  <div class="card stack">
    <span class="eyebrow">Synchronisatie</span>
    <div class="spread"><span>Server</span><span class={sync.online ? 'up' : 'down'}>{sync.online ? 'Bereikbaar' : 'Offline'}</span></div>
    <div class="spread"><span>Wachtend</span><span class="num">{sync.pending}</span></div>
    <div class="spread"><span>Laatst gesynchroniseerd</span><span class="num muted">{last}</span></div>
    {#if sync.needsLogin}<p class="down small">Opnieuw inloggen nodig om te synchroniseren.</p>{/if}
    <button class="btn" onclick={() => runSync({ pull: true })} disabled={sync.busy}>{sync.busy ? 'Bezig…' : 'Nu synchroniseren'}</button>
    {#if sync.failed.length}
      <p class="small down">{sync.failed.length} wijziging(en) door de server geweigerd:</p>
      {#each sync.failed as f (f.at + f.id)}
        <code class="small muted">{f.collection}/{f.id}: {f.message}</code>
      {/each}
      <button class="btn ghost small" onclick={clearFailed}>Lijst wissen</button>
    {/if}
  </div>

  <div class="card stack">
    <span class="eyebrow">Account</span>
    <span class="muted">{pb.authStore.record?.email}</span>
    <button class="btn danger" onclick={logout}>Uitloggen</button>
  </div>
</div>

<style>
  code {
    word-break: break-all;
  }
</style>
