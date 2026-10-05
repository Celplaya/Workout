import { beep } from './sound';

// Timers are stored as absolute timestamps in localStorage, so they survive
// reloads, app switches and a locked screen.

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export const clock = $state({ now: Date.now() });
setInterval(() => (clock.now = Date.now()), 250);

// ---- rest timer ----

export const rest = $state(load('rest', { end: 0, total: 0, alerted: true }));

export function startRest(seconds: number) {
  rest.end = Date.now() + seconds * 1000;
  rest.total = seconds;
  rest.alerted = false;
  store('rest', rest);
}

export function addRest(seconds: number) {
  if (!rest.end) return;
  rest.end = Math.max(Date.now(), rest.end) + seconds * 1000;
  rest.total += seconds;
  rest.alerted = false;
  store('rest', rest);
}

export function stopRest() {
  rest.end = 0;
  rest.alerted = true;
  store('rest', rest);
}

export function restRemaining(): number {
  return rest.end ? Math.max(0, (rest.end - clock.now) / 1000) : 0;
}

$effect.root(() => {
  $effect(() => {
    if (rest.end && !rest.alerted && clock.now >= rest.end) {
      rest.alerted = true;
      store('rest', rest);
      beep(3);
    }
  });
});

// ---- Norwegian 4×4 interval timer ----

export const INTERVALS = { rounds: 4, work: 4 * 60, recover: 3 * 60 };

export const interval = $state(load('interval', { start: 0, session: '' }));

export function startInterval(session: string) {
  interval.start = Date.now();
  interval.session = session;
  store('interval', interval);
}

export function stopInterval() {
  interval.start = 0;
  store('interval', interval);
}

export interface IntervalPhase {
  phase: 'work' | 'recover' | 'done';
  round: number;
  remaining: number;
  /** Index of the current phase, used to detect phase changes. */
  index: number;
}

export function intervalPhase(elapsedSeconds: number): IntervalPhase {
  const { rounds, work, recover } = INTERVALS;
  let t = elapsedSeconds;
  for (let r = 1; r <= rounds; r++) {
    if (t < work) return { phase: 'work', round: r, remaining: work - t, index: 2 * r - 2 };
    t -= work;
    if (r === rounds) break;
    if (t < recover) return { phase: 'recover', round: r, remaining: recover - t, index: 2 * r - 1 };
    t -= recover;
  }
  return { phase: 'done', round: rounds, remaining: 0, index: 2 * rounds - 1 };
}
