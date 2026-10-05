// Short beeps via WebAudio. iOS only allows audio after a user gesture, so the
// context is created/resumed on the first touch.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

export function beep(times = 1, freq = 880) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    const t = t0 + i * 0.25;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
  navigator.vibrate?.(200);
}
