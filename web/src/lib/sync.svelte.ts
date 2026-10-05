import { ClientResponseError } from 'pocketbase';
import * as idb from './idb';
import { pb } from './pb';
import { loadLocal, seedDefaults, setChangeListener, setCollection, store, touchedSince } from './data.svelte';
import { COLLECTIONS, type CollectionName, type OutboxOp } from './types';

// Local-first sync: push the outbox (in order), then pull everything and overlay
// records that still have local changes. Network failures just leave the outbox
// in place; we retry on reconnect, on app focus and on an interval.

export const sync = $state({
  pending: 0,
  online: true,
  busy: false,
  lastSync: 0,
  needsLogin: false,
  failed: [] as { collection: string; id: string; message: string; at: number }[],
});

const PULL_EVERY = 2 * 60 * 1000;
let lastPull = 0;
let running = false;
let again = false;
let againPull = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let refreshed = false;
/** Record ids known to exist on the server (lets us pick update vs. create first). */
const serverIds = new Set<string>();

function isNetworkError(e: unknown): boolean {
  return e instanceof ClientResponseError ? e.status === 0 : true;
}

async function refreshPending() {
  sync.pending = (await idb.outbox()).length;
}

/** Debounced push after a local change. */
export function scheduleSync(delay = 400) {
  clearTimeout(timer);
  timer = setTimeout(() => void runSync(), delay);
}

export async function runSync(opts: { pull?: boolean } = {}): Promise<void> {
  if (running) {
    again = true;
    againPull ||= !!opts.pull;
    return;
  }
  running = true;
  sync.busy = true;
  try {
    if (!pb.authStore.record) return;
    if (!refreshed) {
      await pb.collection('users').authRefresh();
      refreshed = true;
      sync.needsLogin = false;
    }
    if (!pb.authStore.isValid) {
      sync.needsLogin = true;
      return;
    }
    await push();
    if (opts.pull || Date.now() - lastPull > PULL_EVERY) await pull();
    sync.online = true;
    sync.lastSync = Date.now();
  } catch (e) {
    if (isNetworkError(e)) {
      sync.online = false;
    } else if (e instanceof ClientResponseError && (e.status === 401 || e.status === 403)) {
      sync.needsLogin = true;
    } else {
      console.error('sync', e);
    }
  } finally {
    running = false;
    sync.busy = false;
    await refreshPending();
    if (again) {
      const p = againPull;
      again = againPull = false;
      void runSync({ pull: p });
    }
  }
}

async function send(op: OutboxOp): Promise<void> {
  const col = pb.collection(op.collection);
  if (op.op === 'delete') {
    try {
      await col.delete(op.id);
    } catch (e) {
      if (!(e instanceof ClientResponseError && e.status === 404)) throw e;
    }
    return;
  }
  // Ids are generated on the device, so this is an upsert: update records the
  // server already has, create the rest (falling back if our guess was wrong,
  // e.g. when an earlier create succeeded but its response got lost).
  const { id: _id, ...rest } = op.data!;
  if (serverIds.has(op.id)) {
    try {
      await col.update(op.id, rest);
      return;
    } catch (e) {
      if (!(e instanceof ClientResponseError && e.status === 404)) throw e;
    }
  }
  try {
    await col.create(op.data!);
  } catch (e) {
    const dup = e instanceof ClientResponseError && e.status === 400 && e.response?.data?.id?.code === 'validation_not_unique';
    if (!dup) throw e;
    await col.update(op.id, rest);
  }
  serverIds.add(op.id);
}

async function push(): Promise<void> {
  for (;;) {
    const [op] = await idb.outbox();
    if (!op) return;
    try {
      await send(op);
    } catch (e) {
      // Validation errors will never succeed on retry; park them so the queue keeps moving.
      if (e instanceof ClientResponseError && (e.status === 400 || e.status === 404)) {
        sync.failed = [
          ...sync.failed,
          { collection: op.collection, id: op.id, message: JSON.stringify(e.response), at: Date.now() },
        ].slice(-20);
        await idb.setMeta('failed', $state.snapshot(sync.failed));
      } else {
        throw e;
      }
    }
    await idb.dequeue(op);
    sync.pending = Math.max(0, sync.pending - 1);
  }
}

const META_FIELDS = ['collectionId', 'collectionName', 'created', 'updated', 'expand'];

async function pull(): Promise<void> {
  const started = Date.now();
  const remote = await Promise.all(
    COLLECTIONS.map((c) => pb.collection(c).getFullList({ batch: 1000 })),
  );
  const pending = await idb.outbox();
  const keepLocal = touchedSince(started - 60_000);
  for (const op of pending) keepLocal.add(op.id);

  COLLECTIONS.forEach((c, i) => {
    const local = (store as unknown as Record<CollectionName, { id: string }[]>)[c];
    const localById = new Map(local.map((r) => [r.id, r]));
    const merged = new Map<string, object>();
    for (const r of remote[i]) {
      serverIds.add(r.id);
      for (const f of META_FIELDS) delete (r as Record<string, unknown>)[f];
      if (!keepLocal.has(r.id)) merged.set(r.id, r);
    }
    for (const id of keepLocal) {
      const l = localById.get(id);
      if (l) merged.set(id, l);
    }
    const recs = [...merged.values()];
    setCollection(c, recs as never);
    void idb.replaceAll(c, recs);
  });
  lastPull = Date.now();
  if (!store.days.length || !store.settings.length) await seedDefaults();
}

export async function initSync(): Promise<void> {
  await loadLocal();
  sync.failed = (await idb.getMeta('failed')) ?? [];
  await refreshPending();
  setChangeListener(() => {
    sync.pending++;
    scheduleSync();
  });
  window.addEventListener('online', () => void runSync());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runSync();
  });
  setInterval(() => {
    if (sync.pending > 0 || Date.now() - lastPull > PULL_EVERY) void runSync();
  }, 30_000);
  void runSync({ pull: true });
}

/** After a fresh login. */
export function onLogin() {
  refreshed = true;
  sync.needsLogin = false;
  void runSync({ pull: true });
}

export function clearFailed() {
  sync.failed = [];
  void idb.setMeta('failed', []);
}
