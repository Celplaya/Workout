<script lang="ts">
  import { toast } from '../lib/toast.svelte';
</script>

{#if toast.text}
  {#key toast.id}
    <div class="toast" class:pr={toast.kind === 'pr'} role="status">{toast.text}</div>
  {/key}
{/if}

<style>
  .toast {
    position: fixed;
    top: calc(var(--safe-top) + 12px);
    left: 16px;
    right: 16px;
    max-width: 528px;
    margin: 0 auto;
    padding: 16px 18px;
    border-radius: 16px;
    background: var(--surface-2);
    font-weight: 700;
    font-size: 18px;
    text-align: center;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.5);
    z-index: 30;
    animation: drop 0.25s ease-out;
  }
  .pr {
    background: var(--accent);
    color: var(--accent-ink);
  }
  @keyframes drop {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
  }
</style>
