import { openDB, type IDBPDatabase } from 'idb';
import { COLLECTIONS, type CollectionName, type OutboxOp } from './types';

// Local mirror of all PocketBase collections + an outbox of pending writes.
// Everything the app shows comes from here, so it works without a connection.

let dbp: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbp ??= openDB('workout', 2, {
    upgrade(d) {
      // Create whatever is missing, so new collections get a store on upgrade.
      for (const c of COLLECTIONS) if (!d.objectStoreNames.contains(c)) d.createObjectStore(c, { keyPath: 'id' });
      if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    },
  });
  return dbp;
}

export async function getAll<T>(c: CollectionName): Promise<T[]> {
  return (await db()).getAll(c);
}

export async function put(c: CollectionName, rec: object): Promise<void> {
  await (await db()).put(c, rec);
}

export async function del(c: CollectionName, id: string): Promise<void> {
  await (await db()).delete(c, id);
}

/** Replace a whole collection mirror in one transaction. */
export async function replaceAll(c: CollectionName, recs: object[]): Promise<void> {
  const tx = (await db()).transaction(c, 'readwrite');
  await tx.store.clear();
  for (const r of recs) tx.store.put(r);
  await tx.done;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db()).get('meta', key);
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key);
}

export async function clearAll(): Promise<void> {
  const d = await db();
  for (const s of [...COLLECTIONS, 'outbox', 'meta']) await d.clear(s);
}

// ---- outbox ----

/**
 * Queue a write. Repeated upserts of the same record are merged into the
 * earliest pending entry, which keeps parent-before-child ordering intact.
 */
export async function enqueue(op: OutboxOp): Promise<void> {
  const tx = (await db()).transaction('outbox', 'readwrite');
  const pending: OutboxOp[] = await tx.store.getAll();
  const same = pending.filter((p) => p.collection === op.collection && p.id === op.id);
  if (op.op === 'upsert') {
    const prev = same.find((p) => p.op === 'upsert');
    if (prev && !same.some((p) => p.op === 'delete')) {
      prev.data = { ...prev.data, ...op.data };
      await tx.store.put(prev);
    } else {
      await tx.store.add(op);
    }
  } else {
    for (const p of same) await tx.store.delete(p.seq!);
    await tx.store.add(op);
  }
  await tx.done;
}

export async function outbox(): Promise<OutboxOp[]> {
  return (await db()).getAll('outbox');
}

/**
 * Remove a processed entry, unless it was merged with newer data while the
 * request was in flight (then it stays and is sent again).
 */
export async function dequeue(op: OutboxOp): Promise<void> {
  const tx = (await db()).transaction('outbox', 'readwrite');
  const cur: OutboxOp | undefined = await tx.store.get(op.seq!);
  if (cur && JSON.stringify(cur) === JSON.stringify(op)) await tx.store.delete(op.seq!);
  await tx.done;
}
