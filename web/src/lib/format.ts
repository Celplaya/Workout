import type { Measure } from './types';

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });

export function kg(n: number): string {
  return nf.format(n);
}

export function volume(n: number): string {
  return nf0.format(Math.round(n));
}

/** "1:05" */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** "1 u 05 min" / "48 min" */
export function duration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} u ${String(min % 60).padStart(2, '0')} min`;
}

/** Short unit for a measure: "s", "min" or "" for reps. */
export function unitOf(m: Measure | undefined): string {
  return m === 'seconds' ? 's' : m === 'minutes' ? 'min' : '';
}

/** Stepper label for a measure. */
export function stepperUnit(m: Measure | undefined): string {
  return m === 'seconds' ? 'sec' : m === 'minutes' ? 'min' : 'reps';
}

/** "12 s", "30 min" or "8". */
export function amount(v: number, m: Measure | undefined): string {
  const u = unitOf(m);
  return u ? `${nf.format(v)} ${u}` : nf.format(v);
}

/** "4×10 s", "3×8", "8 pogingen". */
export function target(sets: number, value: number, m: Measure | undefined): string {
  if (!value) return sets ? `${sets} ${sets === 1 ? 'poging' : 'pogingen'}` : '—';
  const u = unitOf(m);
  return `${sets}×${nf.format(value)}${u ? ' ' + u : ''}`;
}
