<script lang="ts">
  import { pb } from '../lib/pb';
  import { resetLocal } from '../lib/data.svelte';
  import { onLogin } from '../lib/sync.svelte';

  let { relogin = false, ondone }: { relogin?: boolean; ondone?: () => void } = $props();
  let email = $state(pb.authStore.record?.email ?? '');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      const prev = localStorage.getItem('uid');
      const res = await pb.collection('users').authWithPassword(email.trim(), password);
      // Different account than before: drop the old local copy.
      if (prev && prev !== res.record.id) await resetLocal();
      localStorage.setItem('uid', res.record.id);
      onLogin();
      ondone?.();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      error = status === 0 ? 'Geen verbinding met de server. Staat Tailscale aan?' : 'Onjuist e-mailadres of wachtwoord.';
    } finally {
      busy = false;
    }
  }
</script>

<form class="page no-tabs" onsubmit={submit}>
  <div style="height: 10vh"></div>
  <h1>Workout</h1>
  <p class="muted">{relogin ? 'Je sessie is verlopen. Log opnieuw in om te synchroniseren — je lokale data blijft bewaard.' : 'Log in met je account.'}</p>
  <input class="field" type="email" autocomplete="username" placeholder="E-mail" bind:value={email} required />
  <input class="field" type="password" autocomplete="current-password" placeholder="Wachtwoord" bind:value={password} required />
  {#if error}<p class="down small">{error}</p>{/if}
  <button class="btn primary big" disabled={busy}>{busy ? 'Bezig…' : 'Inloggen'}</button>
  {#if relogin}<button type="button" class="btn ghost" onclick={() => ondone?.()}>Later</button>{/if}
</form>
