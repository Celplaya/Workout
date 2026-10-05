<script lang="ts">
  import { onMount } from 'svelte';
  import { registerSW } from 'virtual:pwa-register';
  import RestBar from './components/RestBar.svelte';
  import TabBar from './components/TabBar.svelte';
  import Toast from './components/Toast.svelte';
  import Cardio from './screens/Cardio.svelte';
  import Day from './screens/Day.svelte';
  import Exercise from './screens/Exercise.svelte';
  import History from './screens/History.svelte';
  import Login from './screens/Login.svelte';
  import Schedule from './screens/Schedule.svelte';
  import Session from './screens/Session.svelte';
  import Settings from './screens/Settings.svelte';
  import Summary from './screens/Summary.svelte';
  import Today from './screens/Today.svelte';
  import { store } from './lib/data.svelte';
  import { pb } from './lib/pb';
  import { go, route } from './lib/router.svelte';
  import { initSync, sync } from './lib/sync.svelte';
  import { unlockAudio } from './lib/sound';

  let authed = $state(!!pb.authStore.record);
  pb.authStore.onChange(() => (authed = !!pb.authStore.record));
  let reloginDismissed = $state(false);

  // New app versions are installed on request (Instellingen), never mid-workout.
  let needRefresh = $state(false);
  const updateSW = registerSW({ onNeedRefresh: () => (needRefresh = true) });

  let started = false;
  $effect(() => {
    if (!authed || started) return;
    started = true;
    void initSync().then(() => {
      // Re-open an unfinished workout (e.g. after the app was closed by accident).
      if (store.active && route.name === '') go('session', true);
    });
  });

  onMount(() => {
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  });

  const param = $derived(route.params[0] ?? '');
  const activeId = $derived(store.active?.id ?? '');
  const inSession = $derived(route.name === 'session' && !!activeId);
</script>

{#if !authed}
  <Login />
{:else if !store.loaded}
  <div class="page"></div>
{:else if sync.needsLogin && !reloginDismissed}
  <Login relogin ondone={() => (reloginDismissed = true)} />
{:else}
  {#if route.name === 'session' && activeId}
    {#key activeId}
      {#if store.sessionById.get(activeId)?.kind === 'cardio'}
        <Cardio id={activeId} />
      {:else}
        <Session id={activeId} />
      {/if}
    {/key}
  {:else if route.name === 'summary'}
    {#key param}<Summary id={param} />{/key}
  {:else if route.name === 'history'}
    <History />
  {:else if route.name === 'exercise'}
    {#key param}<Exercise id={param} />{/key}
  {:else if route.name === 'schedule'}
    <Schedule />
  {:else if route.name === 'day'}
    {#key param}<Day id={param} />{/key}
  {:else if route.name === 'settings'}
    <Settings {needRefresh} onupdate={() => updateSW(true)} />
  {:else}
    <Today />
  {/if}

  {#if !inSession}<TabBar />{/if}
  <RestBar withTabs={!inSession} />
{/if}
<Toast />
