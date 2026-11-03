/**
 * Persistent offline outbox.
 *
 * Every write that cannot reach the server is stored here (AsyncStorage, so it
 * survives restarts) and replayed FIFO by the sync engine when connectivity
 * returns. The in-memory cache is updated optimistically at enqueue time, so
 * screens keep working offline with zero special-casing.
 *
 * op = {
 *   id,            // outbox id  `op-<ts>-<rand>`
 *   createdAt,     // Date.now()
 *   retries,       // number of failed replay attempts
 *   resourceKey,   // cache key, e.g. 'notes' (for reconciliation + counts)
 *   method,        // POST | PATCH | PUT | DELETE
 *   path,          // API path, e.g. '/node-matrix/123/'
 *   body,          // JSON body or null
 *   localId,       // temp id for offline-created items (POST only)
 *   targetId,      // server id the op applies to (PATCH/PUT/DELETE)
 * }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { cleanupStagedFile } from './fileQueue';

const OUTBOX_KEY = 'jibunai:outbox:v1';

let ops = [];
let loaded = false;
let loadPromise = null;
const listeners = new Set();

const notify = () => {
  const snapshot = [...ops];
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      /* listener errors must not break the queue */
    }
  });
};

async function load() {
  if (loaded) return ops;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(OUTBOX_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      ops = Array.isArray(parsed) ? parsed : [];
    } catch {
      ops = [];
    }
    loaded = true;
    return ops;
  })();
  return loadPromise;
}

async function persist() {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  } catch {
    /* storage full — the in-memory copy still syncs this session */
  }
  notify();
}

const uid = () => `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Subscribe to queue snapshots. Returns an unsubscribe function. */
export function subscribeOutbox(listener) {
  listeners.add(listener);
  load().then(() => listener([...ops]));
  return () => listeners.delete(listener);
}

/** Current queued ops (loads from disk on first call). */
export async function listOps() {
  await load();
  return [...ops];
}

/** Synchronous snapshot of what is loaded so far (may be empty pre-load). */
export function getOpsSync() {
  return [...ops];
}

/** Number of queued ops, optionally filtered by resourceKey. */
export function pendingCount(resourceKey = null) {
  if (!resourceKey) return ops.length;
  return ops.filter((o) => o.resourceKey === resourceKey).length;
}

export async function enqueueOp(input) {
  await load();
  const op = {
    id: uid(),
    createdAt: Date.now(),
    retries: 0,
    method: 'POST',
    path: '',
    body: null,
    resourceKey: null,
    localId: null,
    targetId: null,
    ...input,
  };
  ops.push(op);
  await persist();
  return op;
}

export async function removeOp(id) {
  await load();
  ops = ops.filter((o) => o.id !== id);
  await persist();
}

/** Remove the queued POST that created a still-unsynced local item. */
export async function removeOpsForLocalId(localId) {
  await load();
  ops = ops.filter((o) => o.localId !== localId);
  await persist();
}

export async function bumpRetries(id) {
  await load();
  ops = ops.map((o) => (o.id === id ? { ...o, retries: (o.retries || 0) + 1 } : o));
  await persist();
}

/**
 * Merge a patch into the queued POST body for an offline-created item.
 * Returns true when a matching op was found (so the caller knows no PATCH
 * needs to be queued — the create itself now carries the latest content).
 */
export async function mergeIntoQueuedCreate(localId, patchBody) {
  await load();
  let merged = false;
  ops = ops.map((o) => {
    if (o.localId === localId && o.method === 'POST') {
      merged = true;
      return { ...o, body: { ...(o.body || {}), ...(patchBody || {}) } };
    }
    return o;
  });
  if (merged) await persist();
  return merged;
}

/**
 * Merge a replacement upload into the queued POST for an offline-created item.
 * Returns true when a matching op was found.
 */
export async function mergeUploadIntoQueuedCreate(localId, upload) {
  await load();
  let merged = false;
  ops = ops.map((o) => {
    if (o.localId === localId && o.method === 'POST') {
      merged = true;
      if (o.upload?.fileUri) cleanupStagedFile(o.upload.fileUri).catch(() => {});
      return { ...o, upload };
    }
    return o;
  });
  if (merged) await persist();
  return merged;
}

export async function clearOps() {
  ops = [];
  loaded = true;
  await persist();
}
