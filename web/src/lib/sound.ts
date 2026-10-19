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

/** Very short, quiet click: one per second during a hands-free hold. */
export function tick() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.15, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

let voice: SpeechSynthesisVoice | null | undefined;

/**
 * Speak a short text (e.g. the seconds while you're upside down). iOS only allows
 * speech after a tap, so call primeSpeech() from the button that starts the timer.
 * Silently does nothing where speech isn't available.
 */
export function say(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    voice ??= speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('nl')) ?? null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-NL';
    if (voice) u.voice = voice;
    u.rate = 1.15;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* speech unavailable */
  }
}

export function primeSpeech() {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    /* speech unavailable */
  }
}
