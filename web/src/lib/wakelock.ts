// Keep the screen on during a workout (Screen Wake Lock API, iOS 16.4+).

let lock: WakeLockSentinel | null = null;
let wanted = false;

async function acquire() {
  try {
    if (wanted && !lock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => (lock = null));
    }
  } catch {
    /* not supported or denied */
  }
}

document.addEventListener('visibilitychange', () => void acquire());

export function keepAwake(on: boolean) {
  wanted = on;
  if (on) void acquire();
  else {
    void lock?.release();
    lock = null;
  }
}
