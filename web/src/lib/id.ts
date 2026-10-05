const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** PocketBase-compatible record id (15 chars, [a-z0-9]) generated on the device. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
