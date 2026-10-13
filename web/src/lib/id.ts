const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** PocketBase-compatible record id (15 chars, [a-z0-9]) generated on the device. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Deterministic record id for the same input. Records seeded by the program
 * (or dismissals) get the same id on every device, so running it twice is a
 * harmless upsert instead of a duplicate.
 */
export function stableId(...parts: (string | number)[]): string {
  const key = parts.join('|');
  let out = '';
  for (let seed = 1; out.length < 15; seed++) {
    let n = cyrb53(key, seed);
    for (let i = 0; i < 8 && out.length < 15; i++) {
      out += ALPHABET[n % ALPHABET.length];
      n = Math.floor(n / ALPHABET.length);
    }
  }
  return out;
}
