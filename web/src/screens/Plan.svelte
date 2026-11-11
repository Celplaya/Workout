<script lang="ts">
  import { PLAN, PLAN_TITLE } from '../lib/plan';
</script>

<div class="page">
  <div class="header">
    <a class="back" href="#/settings" aria-label="Terug">‹</a>
    <h1>Trainingsplan</h1>
  </div>
  <p class="muted">{PLAN_TITLE}</p>

  {#each PLAN as s (s.title)}
    <div class="card stack">
      <h3>{s.title}</h3>
      {#if s.intro}<p class="small muted">{s.intro}</p>{/if}
      {#if s.table}
        <div class="wrap">
          <table>
            <thead><tr>{#each s.table.head as h (h)}<th>{h}</th>{/each}</tr></thead>
            <tbody>
              {#each s.table.rows as r (r[0])}
                <tr>{#each r as c, i (i)}<td class:first={i === 0}>{c}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      {#if s.bullets}
        <ul>{#each s.bullets as b, i (i)}<li>{b}</li>{/each}</ul>
      {/if}
      {#if s.note}<p class="small note">{s.note}</p>{/if}
    </div>
  {/each}
</div>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
  }
  .back {
    font-size: 30px;
    line-height: 1;
    padding: 0 8px 4px 0;
    color: var(--muted);
    text-decoration: none;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  p,
  ul {
    margin: 0;
  }
  ul {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    line-height: 1.4;
  }
  .wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    text-align: left;
    font-weight: 600;
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0 8px 6px 0;
  }
  td {
    padding: 7px 8px 7px 0;
    border-top: 1px solid var(--line);
    vertical-align: top;
  }
  td.first {
    font-weight: 600;
    white-space: nowrap;
  }
  .note {
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    line-height: 1.4;
  }
</style>
