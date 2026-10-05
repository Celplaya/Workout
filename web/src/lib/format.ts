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
