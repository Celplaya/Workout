<script lang="ts">
  import Spark from '../components/Spark.svelte';
  import { store } from '../lib/data.svelte';
  import { addDays, isoDate, longDate, parseDate, shortDate, weekStart, WEEKDAYS_SHORT } from '../lib/dates';
  import { ADVICE, BUILDUP, BUILDUP_FROM, buildupStep, buildupWeek, cardioWeeks, isCardio, recovery } from '../lib/recovery';
  import type { Daily } from '../lib/types';

  const today = isoDate();
  const rec = $derived(recovery(store.daily, today));
  const d = $derived(rec.day);

  // Last 28 days, oldest first, with gaps for days without data.
  const byDate = $derived(new Map(store.daily.map((x) => [x.date, x])));
  const span = $derived(Array.from({ length: 28 }, (_, i) => byDate.get(isoDate(addDays(parseDate(today), i - 27)))));
  const series = (k: keyof Daily) => span.map((x) => (x ? Number(x[k]) || 0 : 0));
  const avg = (v: number[]) => {
    const r = v.filter((n) => n > 0);
    return r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0;
  };

  const hm = (min: number) => `${Math.floor(min / 60)}u${String(min % 60).padStart(2, '0')}`;
  const STATUS: Record<string, string> = { BALANCED: 'in balans', UNBALANCED: 'uit balans', LOW: 'laag', POOR: 'slecht' };
  const hrvPos = $derived.by(() => {
    if (!d || !d.hrv || !d.hrv_low || !d.hrv_high) return null;
    const w = d.hrv_high - d.hrv_low;
    const lo = d.hrv_low - w * 0.6;
    const hi = d.hrv_high + w * 0.6;
    return {
      at: Math.min(100, Math.max(0, ((d.hrv - lo) / (hi - lo)) * 100)),
      from: ((d.hrv_low - lo) / (hi - lo)) * 100,
      to: ((d.hrv_high - lo) / (hi - lo)) * 100,
    };
  });

  // This week
  const monday = $derived(parseDate(weekStart(new Date())));
  const week = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const date = isoDate(addDays(monday, i));
      const planned = store.dayByWeekday.get(i + 1);
      return {
        label: WEEKDAYS_SHORT[i],
        date,
        today: date === today,
        future: date > today,
        strength: store.finished.some((s) => s.date === date && s.kind !== 'cardio' && !/rust/i.test(s.day_name)),
        cardio: store.activities.some((a) => a.date === date && isCardio(a)),
        plannedStrength: !!planned && planned.kind === 'strength' && !/rust/i.test(planned.name),
        steps: byDate.get(date)?.steps ?? 0,
      };
    }),
  );
  const weeks = $derived(cardioWeeks(store.activities, 8));
  const thisWeek = $derived(weeks[weeks.length - 1]);
  const step = $derived(buildupStep(today));
  const goal = $derived(BUILDUP[Math.max(0, step)]);
  const strengthDone = $derived(week.filter((w) => w.strength).length);
  const strengthPlanned = $derived(week.filter((w) => w.plannedStrength).length);
  const stepsAvg = $derived(avg(week.map((w) => w.steps)));

  const acts = $derived(
    store.activities.filter((a) => isCardio(a)).sort((a, b) => b.start - a.start || b.date.localeCompare(a.date)).slice(0, 8),
  );
  const zones = (a: (typeof acts)[number]) => [a.z1 ?? 0, a.z2 ?? 0, a.z3 ?? 0, a.z4 ?? 0, a.z5 ?? 0];
  const zoneTotal = (a: (typeof acts)[number]) => zones(a).reduce((n, v) => n + v, 0);

  const lastSync = $derived(Math.max(0, ...store.daily.map((x) => x.synced || 0)));
  const syncText = $derived.by(() => {
    if (!lastSync) return '';
    const t = new Date(lastSync);
    const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    return isoDate(t) === today ? `bijgewerkt ${time}` : `bijgewerkt ${shortDate(t)} ${time}`;
  });
  const syncOld = $derived(!!lastSync && Date.now() - lastSync > 6 * 3600_000);
</script>

<div class="page body">
  <div class="header"><h1>Voortgang</h1></div>
  <div class="segmented">
    <a href="#/history">Kracht</a>
    <a class="on" href="#/body">Conditie</a>
  </div>

  <p class="dateline">
    {longDate(new Date())}{#if syncText}<span class:old={syncOld}>{' · Garmin ' + syncText}</span>{/if}
  </p>

  <!-- Recovery -->
  <section>
    <span class="label">Herstel{#if rec.stale && d} · {shortDate(parseDate(d.date))}{/if}</span>
    <div class="verdict {rec.verdict}">
      <span class="mark"></span>
      <h2>{rec.title}</h2>
    </div>
    <p class="advice">{ADVICE[rec.verdict]}</p>
    {#if rec.reasons.length}<p class="reasons">{rec.reasons.join(' · ')}</p>{/if}

    {#if d}
      <div class="grid">
        <div class="metric">
          <span class="label">HRV</span>
          <span class="value">{d.hrv || '—'}<small>ms</small></span>
          <span class="sub">
            {[STATUS[d.hrv_status?.toUpperCase()] ?? 'geen status', d.hrv_low && d.hrv_high ? `bereik ${d.hrv_low}–${d.hrv_high}` : ''].filter(Boolean).join(' · ')}
          </span>
          {#if hrvPos}
            <div class="range">
              <span class="zone" style:left="{hrvPos.from}%" style:width="{hrvPos.to - hrvPos.from}%"></span>
              <span class="pin" style:left="{hrvPos.at}%"></span>
            </div>
          {/if}
        </div>
        <div class="metric">
          <span class="label">Rusthartslag</span>
          <span class="value">{d.resting_hr || '—'}<small>bpm</small></span>
          <span class="sub">{rec.rhrBase ? `gem. ${rec.rhrBase} over 7 dagen` : 'nog geen gemiddelde'}</span>
        </div>
        <div class="metric">
          <span class="label">Slaap</span>
          <span class="value">{d.sleep_minutes ? hm(d.sleep_minutes) : '—'}</span>
          <span class="sub">{d.sleep_score ? `score ${d.sleep_score}` : 'geen score'}</span>
        </div>
        <div class="metric">
          <span class="label">Body Battery</span>
          <span class="value">{d.battery_high || '—'}</span>
          <span class="sub">{d.battery_low ? `laagste ${d.battery_low}` : 'hoogste van vandaag'}</span>
        </div>
      </div>
    {:else}
      <p class="empty-note">
        Hersteldata komt binnen zodra <b>workout-pb</b> en <b>workout-garmin</b> opnieuw gestart zijn na deze update.
      </p>
    {/if}
  </section>

  <!-- This week -->
  <section>
    <span class="label">Deze week</span>
    <div class="days">
      {#each week as w (w.date)}
        <div class="day" class:today={w.today} class:future={w.future}>
          <span class="d">{w.label}</span>
          <span class="pips">
            <span class="pip k" class:on={w.strength} class:plan={w.plannedStrength && !w.strength}></span>
            <span class="pip c" class:on={w.cardio}></span>
          </span>
        </div>
      {/each}
    </div>
    <div class="legend"><span><i class="pip k on"></i> kracht</span><span><i class="pip c on"></i> cardio</span></div>
    <div class="rows">
      <div class="line"><span>Kracht</span><span class="num">{strengthDone}<small> / {strengthPlanned} sessies</small></span></div>
      <div class="line">
        <span>Cardio</span>
        <span class="num">{thisWeek.sessions}<small> / {goal.sessions} · {thisWeek.minutes} van {goal.minutes} min</small></span>
      </div>
      {#if thisWeek.zoned}
        <div class="line"><span>Echt in zone 2</span><span class="num">{thisWeek.zone2}<small> van {thisWeek.zoned} min</small></span></div>
      {/if}
      {#if stepsAvg}
        <div class="line"><span>Stappen per dag</span><span class="num">{stepsAvg.toLocaleString('nl-NL')}</span></div>
      {/if}
    </div>
  </section>

  <!-- Build-up -->
  <section>
    <span class="label">Zone 2-opbouw</span>
    <h3>
      {#if step < 0}Start maandag {shortDate(parseDate(BUILDUP_FROM))}{:else}Week {Math.min(8, buildupWeek(today))} van 8{/if}
    </h3>
    <div class="steps">
      {#each BUILDUP as b, i (b.weeks)}
        <div class="step" class:now={i === Math.max(0, step)} class:done={i < step}>
          <span class="bar"></span>
          <span class="w">{b.weeks}</span>
          <span class="t">{b.duration}</span>
          <span class="t muted">{b.sessions}× · {b.incline}</span>
        </div>
      {/each}
    </div>
    <p class="sub">Je hartslag is leidend; verhoog nooit snelheid, helling en duur tegelijk.</p>
  </section>

  <!-- Trends -->
  {#if store.daily.length > 2}
    <section>
      <span class="label">Vier weken</span>
      <div class="trend">
        <div class="thead"><span>HRV</span><span class="num">{avg(series('hrv').slice(-7)) || '—'}<small> ms · 7 dagen</small></span></div>
        <div class="spark"><Spark values={series('hrv')} band={d?.hrv_low && d?.hrv_high ? [d.hrv_low, d.hrv_high] : undefined} /></div>
      </div>
      <div class="trend">
        <div class="thead"><span>Rusthartslag</span><span class="num">{avg(series('resting_hr').slice(-7)) || '—'}<small> bpm · 7 dagen</small></span></div>
        <div class="spark"><Spark values={series('resting_hr')} /></div>
      </div>
      <div class="trend">
        <div class="thead">
          <span>Slaap</span><span class="num">{avg(series('sleep_minutes').slice(-7)) ? hm(avg(series('sleep_minutes').slice(-7))) : '—'}<small> · 7 dagen</small></span>
        </div>
        <div class="spark"><Spark values={series('sleep_minutes')} kind="bars" target={420} /></div>
      </div>
    </section>
  {/if}

  <!-- Cardio per week -->
  <section>
    <span class="label">Cardio per week</span>
    <div class="trend">
      <div class="thead"><span>Minuten</span><span class="num">{thisWeek.minutes}<small> deze week · doel {goal.minutes}</small></span></div>
      <div class="spark"><Spark values={weeks.map((w) => w.minutes)} kind="bars" target={goal.minutes} height={56} /></div>
    </div>
    {#if acts.length}
      <div class="acts">
        {#each acts as a (a.id)}
          <div class="act">
            <div class="line">
              <span>{a.name || a.type}<small>{shortDate(parseDate(a.date))}</small></span>
              <span class="num">{a.minutes}<small>{a.avg_hr ? `min · ${a.avg_hr} bpm` : 'min'}</small></span>
            </div>
            {#if zoneTotal(a)}
              <div class="zones" title="Tijd per hartslagzone">
                {#each zones(a) as z, i (i)}{#if z}<span class="z{i + 1}" style:flex={z}></span>{/if}{/each}
              </div>
              <span class="sub">{a.z2 ?? 0} van {zoneTotal(a)} min in zone 2</span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty-note">Nog geen cardio-activiteiten van Garmin.</p>
    {/if}
  </section>
</div>

<style>
  .body {
    gap: 0;
  }
  .segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 4px;
  }
  .segmented a {
    text-align: center;
    text-decoration: none;
    padding: 9px 0;
    border-radius: 10px;
    color: var(--muted);
    font-weight: 600;
    font-size: 15px;
  }
  .segmented a.on {
    background: var(--surface-2);
    color: var(--text);
  }
  .dateline {
    margin: 18px 2px 0;
    font-size: 13px;
    color: var(--muted);
    letter-spacing: 0.01em;
  }
  .dateline .old {
    color: var(--down);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 26px 2px;
    border-bottom: 1px solid var(--line);
  }
  section:last-child {
    border-bottom: 0;
  }
  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  h2,
  h3,
  p {
    margin: 0;
  }
  .verdict {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 2px;
  }
  .verdict h2 {
    font-size: 30px;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .mark {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
    background: var(--muted);
  }
  .go .mark {
    background: var(--accent);
  }
  .watch .mark {
    background: #d9c08a;
  }
  .reduce .mark {
    background: var(--down);
  }
  .advice {
    font-size: 16px;
    line-height: 1.45;
    max-width: 34ch;
  }
  .reasons,
  .sub {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.4;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 12px;
    border-top: 1px solid var(--line);
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 16px 0 14px;
    border-bottom: 1px solid var(--line);
  }
  .metric:nth-child(odd) {
    padding-right: 14px;
    border-right: 1px solid var(--line);
  }
  .metric:nth-child(even) {
    padding-left: 16px;
  }
  .metric:nth-last-child(-n + 2) {
    border-bottom: 0;
    padding-bottom: 0;
  }
  .value {
    font-size: 34px;
    font-weight: 300;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  small {
    font-size: 13px;
    font-weight: 400;
    color: var(--muted);
    letter-spacing: 0;
  }
  small {
    margin-left: 0.35em;
  }
  .range {
    position: relative;
    height: 12px;
    margin-top: 6px;
  }
  .range::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 5px;
    height: 2px;
    border-radius: 1px;
    background: var(--line);
  }
  .range .zone {
    position: absolute;
    top: 5px;
    height: 2px;
    background: var(--muted);
  }
  .range .pin {
    position: absolute;
    top: 1px;
    width: 10px;
    height: 10px;
    margin-left: -5px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px var(--bg);
  }
  .empty-note {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.45;
  }
  .empty-note b {
    color: var(--text);
    font-weight: 600;
  }
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-top: 4px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-radius: 10px;
  }
  .day.today {
    background: var(--surface);
  }
  .day .d {
    font-size: 12px;
    color: var(--muted);
  }
  .day.today .d {
    color: var(--text);
    font-weight: 600;
  }
  .pips {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: center;
  }
  .pip {
    display: inline-block;
    width: 9px;
    height: 9px;
    border: 1px solid transparent;
  }
  .pip.k {
    border-radius: 2px;
  }
  .pip.c {
    border-radius: 50%;
  }
  .pip.plan {
    border-color: var(--line);
  }
  .pip.k.on {
    background: var(--text);
  }
  .pip.c.on {
    background: var(--accent);
  }
  .legend {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--muted);
  }
  .legend i {
    margin-right: 5px;
    vertical-align: -1px;
  }
  .rows {
    display: flex;
    flex-direction: column;
  }
  .line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 11px 0;
    border-top: 1px solid var(--line);
    font-size: 15px;
  }
  .num {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    text-align: right;
  }
  h3 {
    font-size: 22px;
    font-weight: 300;
    letter-spacing: -0.01em;
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 4px;
  }
  .step {
    display: flex;
    flex-direction: column;
    gap: 3px;
    opacity: 0.5;
  }
  .step.now,
  .step.done {
    opacity: 1;
  }
  .step .bar {
    height: 2px;
    border-radius: 1px;
    background: var(--line);
    margin-bottom: 6px;
  }
  .step.done .bar {
    background: var(--muted);
  }
  .step.now .bar {
    background: var(--accent);
  }
  .step .w {
    font-size: 12px;
    font-weight: 600;
  }
  .step .t {
    font-size: 12px;
    line-height: 1.3;
  }
  .muted {
    color: var(--muted);
  }
  .trend {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0 4px;
    border-top: 1px solid var(--line);
  }
  .thead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 15px;
  }
  .acts {
    display: flex;
    flex-direction: column;
  }
  .act {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 10px;
  }
  .act .line {
    padding-bottom: 2px;
  }
  .zones {
    display: flex;
    gap: 2px;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
  }
  .zones span {
    min-width: 2px;
  }
  .z1 {
    background: #3a3f45;
  }
  .z2 {
    background: var(--accent);
  }
  .z3 {
    background: #d9c08a;
  }
  .z4 {
    background: #e39a73;
  }
  .z5 {
    background: var(--down);
  }
</style>
