<script lang="ts">
  import { onMount } from 'svelte';
  import RestBar from './components/RestBar.svelte';
  import TabBar from './components/TabBar.svelte';
  import Toast from './components/Toast.svelte';
  import Login from './screens/Login.svelte';
  import Session from './screens/Session.svelte';
  import Today from './screens/Today.svelte';
  import { store } from './lib/data.svelte';
  import { pb } from './lib/pb';
  import { go, route } from './lib/router.svelte';
  import { initSync, sync } from './lib/sync.svelte';
  import { unlockAudio } from './lib/sound';

  let authed = $state(!!pb.authStore.record);
  pb.authStore.onChange(() => (authed = !!pb.authStore.record));
  let reloginDismissed = $state(false);

  onMount(() => {
    void initSync().then(() => {
      // Re-open an unfinished workout (e.g. after the app was closed by accident).
      if (store.active && route.name === '') go('session', true);
    });
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  });

  const inSession = $derived(route.name === 'session');
</script>

{#if !authed}
  <Login />
{:else if !store.loaded}
  <div class="page"></div>
{:else if sync.needsLogin && !reloginDismissed}
  <Login relogin ondone={() => (reloginDismissed = true)} />
{:else}
  {#if route.name === 'session'}
    {#if store.active}
      <Session session={store.active} />
    {:else}
      <Today />
    {/if}
  {:else}
    <Today />
  {/if}

  {#if !inSession}<TabBar />{/if}
  <RestBar withTabs={!inSession} />
{/if}
<Toast />
