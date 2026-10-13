<script lang="ts">
  import { route } from '../lib/router.svelte';

  const tabs = [
    { path: '', label: 'Vandaag', icon: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z' },
    { path: 'skills', label: 'Skills', icon: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z' },
    { path: 'history', label: 'Voortgang', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { path: 'schedule', label: 'Schema', icon: 'M4 6h16M4 12h16M4 18h10' },
    { path: 'settings', label: 'Instellingen', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5L7 17M17 17l1.5 1.5M5.5 5.5L7 7' },
  ];
  const active = (p: string) =>
    p === route.name || (p === 'history' && route.name === 'exercise') || (p === 'schedule' && route.name === 'day');
</script>

<nav>
  {#each tabs as t (t.path)}
    <a href={'#/' + t.path} class:on={active(t.path)}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={t.icon} /></svg>
      <span>{t.label}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    height: calc(var(--tab-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--line);
    z-index: 10;
  }
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 10.5px;
    font-weight: 600;
    text-decoration: none;
    color: var(--muted);
  }
  a.on {
    color: var(--text);
  }
</style>
